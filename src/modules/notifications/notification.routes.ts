import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../common/async-handler";
import { AuthRequest, authenticate, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { NotificationService } from "./notification.service";

const service = new NotificationService();
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
  unreadOnly: z.enum(["true", "false"]).transform((value) => value === "true").default(false),
});

export const notificationRouter = Router();
notificationRouter.use(authenticate, requirePasswordChange);

notificationRouter.get("/", validate({ query: listQuerySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const { page, size, unreadOnly } = req.query as unknown as z.infer<typeof listQuerySchema>;
  res.json(await service.list(req.user!.id, page, size, unreadOnly));
}));
notificationRouter.get("/unread-count", asyncHandler(async (req: AuthRequest, res) => {
  res.json(await service.unreadCount(req.user!.id));
}));
// Registered before "/:id/read" so "read-all" can never be parsed as an id.
notificationRouter.patch("/read-all", asyncHandler(async (req: AuthRequest, res) => {
  await service.markAllRead(req.user!.id);
  res.status(204).send();
}));
notificationRouter.patch("/:id/read", validate({ params: idSchema }), asyncHandler(async (req: AuthRequest, res) => {
  await service.markRead(req.user!.id, Number(req.params.id));
  res.status(204).send();
}));
