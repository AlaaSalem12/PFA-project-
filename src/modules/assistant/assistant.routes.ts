import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { ApiError } from "../../common/api-error";
import { asyncHandler } from "../../common/async-handler";
import { auditFrom } from "../../common/audit";
import { rateLimitHandler } from "../../common/rate-limit";
import { env } from "../../config/env";
import { AuthRequest, authenticate, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { assistantService } from "./assistant.service";
import { suggestionsByRole } from "./assistant.suggestions";
import { isAssistantEnabled, llmModel } from "./llm.client";

const idParams = z.object({ id: z.coerce.number().int().positive() });
const messageBody = z.object({ content: z.string().trim().min(1).max(2000) });
const conversationBody = z.object({ title: z.string().trim().max(120).optional() }).optional();

/** 30 messages per hour per user (keyed on the user, not the IP: several users can share a NAT). */
const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1000 : 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `assistant:${(req as AuthRequest).user!.id}`,
  handler: rateLimitHandler,
});

export const assistantRouter = Router();
assistantRouter.use(authenticate, requirePasswordChange);

assistantRouter.get("/status", (_req, res) => {
  const enabled = isAssistantEnabled();
  res.json({ enabled, model: enabled ? llmModel() : null });
});

assistantRouter.get("/suggestions", (req: AuthRequest, res) => {
  res.json(suggestionsByRole[req.user!.role] ?? []);
});

assistantRouter.get("/conversations", asyncHandler(async (req: AuthRequest, res) => {
  res.json(await assistantService.listConversations(req.user!.id));
}));

assistantRouter.post("/conversations", validate({ body: conversationBody }), asyncHandler(async (req: AuthRequest, res) => {
  res.status(201).json(await assistantService.createConversation(req.user!.id, req.body?.title));
}));

assistantRouter.get("/conversations/:id/messages", validate({ params: idParams }), asyncHandler(async (req: AuthRequest, res) => {
  res.json(await assistantService.listMessages(req.user!.id, Number(req.params.id)));
}));

assistantRouter.post("/conversations/:id/messages", messageLimiter, validate({ params: idParams, body: messageBody }),
  asyncHandler(async (req: AuthRequest, res) => {
    const conversationId = Number(req.params.id);
    const { userMessage, assistantMessage, latencyMs } = await assistantService.sendMessage(req.user!, conversationId, req.body.content);
    // The message text is deliberately not audited, only what happened.
    await auditFrom(req, {
      action: "ASSISTANT_MESSAGE", entity: "AssistantConversation", entityId: conversationId,
      metadata: { conversationId, toolsUsed: assistantMessage.toolsUsed, latencyMs },
    });
    res.json({ userMessage, assistantMessage });
  }));

/**
 * Server-sent events: `tool` {name}, `delta` {text}, then `done` {userMessage, assistantMessage} or `error` {message, code}.
 * 400/404/429/503 detected before streaming starts are returned as normal JSON errors.
 */
assistantRouter.post("/conversations/:id/messages/stream", messageLimiter, validate({ params: idParams, body: messageBody }),
  asyncHandler(async (req: AuthRequest, res) => {
    const conversationId = Number(req.params.id);
    await assistantService.assertCanSend(req.user!.id, conversationId);

    res.status(200).set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx: do not buffer the stream
    });
    res.flushHeaders();
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      const { userMessage, assistantMessage, latencyMs } = await assistantService.streamMessage(
        req.user!, conversationId, req.body.content,
        (event) => (event.type === "tool" ? send("tool", { name: event.name }) : send("delta", { text: event.text })),
      );
      await auditFrom(req, {
        action: "ASSISTANT_MESSAGE", entity: "AssistantConversation", entityId: conversationId,
        metadata: { conversationId, toolsUsed: assistantMessage.toolsUsed, latencyMs, streamed: true },
      });
      send("done", { userMessage, assistantMessage });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : undefined;
      send("error", { message: apiError?.message ?? "Assistant is unavailable right now", code: apiError?.code ?? "ASSISTANT_UNAVAILABLE" });
    } finally {
      res.end();
    }
  }));

assistantRouter.delete("/conversations/:id", validate({ params: idParams }), asyncHandler(async (req: AuthRequest, res) => {
  await assistantService.deleteConversation(req.user!.id, Number(req.params.id));
  res.status(204).send();
}));
