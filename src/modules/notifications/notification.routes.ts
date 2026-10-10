import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../common/async-handler";
import { AuthRequest, authenticate, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";

const idSchema = z.object({ id: z.coerce.number().int().positive() });
export const notificationRouter = Router();
notificationRouter.use(authenticate, requirePasswordChange);
notificationRouter.get("/", asyncHandler(async (req: AuthRequest, res) => {
  res.json(await prisma.notification.findMany({
    where: { userId: req.user!.id }, orderBy: { createdAt: "desc" },
  }));
}));
notificationRouter.patch("/:id/read", validate({ params: idSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const notification = await prisma.notification.updateMany({
    where: { id: Number(req.params.id), userId: req.user!.id },
    data: { readAt: new Date() },
  });
  if (notification.count === 0) { res.status(404).json({ message: "Notification not found" }); return; }
  res.status(204).send();
}));
