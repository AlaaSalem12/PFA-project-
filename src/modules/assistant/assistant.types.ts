import { Role } from "@prisma/client";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { z } from "zod";
import type { AuthUser } from "../../middlewares/auth";

export type ToolContext = { user: AuthUser };

/** A read-only capability the LLM may call. `roles` is enforced both when listing and when running. */
export interface AssistantTool<Args = unknown> {
  name: string;
  description: string;
  roles: Role[];
  args: z.ZodType<Args>;
  handler(ctx: ToolContext, args: Args): Promise<unknown>;
}

export interface ToolRegistry {
  /** Tool definitions (OpenAI format) the given user is allowed to see. */
  forUser(user: AuthUser): ChatCompletionTool[];
  /** Runs a tool by name; never throws, returns `{error}` instead. */
  run(user: AuthUser, name: string, rawArgs: unknown): Promise<unknown>;
}
