import { Router } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/async-handler";
import { auditFrom } from "../../common/audit";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { createUserSchema, enabledSchema, updateUserSchema, userIdSchema, userListQuerySchema } from "./user.schemas";
import { UserService } from "./user.service";

const service = new UserService();
export const userRouter = Router();
userRouter.use(authenticate, requirePasswordChange, authorize(Role.ADMIN));

userRouter.get("/", validate({ query: userListQuerySchema }), asyncHandler(async (req, res) => {
  const query = req.query as unknown as {
    page: number; size: number; search: string; sort: string; role?: Role; enabled?: boolean;
  };
  res.json(await service.list(query.page, query.size, query.search, query.sort, query.role, query.enabled));
}));
userRouter.post("/", validate({ body: createUserSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const result = await service.create(req.body, req.user!.id);
  await auditFrom(req, { action: "USER_CREATED", entity: "User", entityId: result.user.id, metadata: { username: result.user.username, role: result.user.role } });
  res.status(201).json(result);
}));
userRouter.get("/:id", validate({ params: userIdSchema }), asyncHandler(async (req, res) => {
  res.json(await service.get(Number(req.params.id)));
}));
userRouter.put("/:id", validate({ params: userIdSchema, body: updateUserSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const user = await service.update(Number(req.params.id), req.body, req.user!.id);
  await auditFrom(req, { action: "USER_UPDATED", entity: "User", entityId: user.id, metadata: { fields: Object.keys(req.body) } });
  res.json(user);
}));
userRouter.patch("/:id/enabled", validate({ params: userIdSchema, body: enabledSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const user = await service.setEnabled(Number(req.params.id), req.body.enabled, req.user!.id);
  await auditFrom(req, { action: req.body.enabled ? "USER_ENABLED" : "USER_DISABLED", entity: "User", entityId: user.id });
  res.json(user);
}));
const resetCredentials = asyncHandler(async (req: AuthRequest, res) => {
  const result = await service.resetPassword(Number(req.params.id));
  await auditFrom(req, { action: "USER_PASSWORD_RESET", entity: "User", entityId: result.user.id, metadata: { emailSent: result.emailSent } });
  res.json(result);
});
userRouter.post("/:id/reset-password", validate({ params: userIdSchema }), resetCredentials);
userRouter.post("/:id/unlock", validate({ params: userIdSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const user = await service.unlock(Number(req.params.id));
  await auditFrom(req, { action: "USER_UNLOCKED", entity: "User", entityId: user.id });
  res.json(user);
}));
userRouter.delete("/:id", validate({ params: userIdSchema }), asyncHandler(async (req: AuthRequest, res) => {
  await service.remove(Number(req.params.id), req.user!.id);
  await auditFrom(req, { action: "USER_DELETED", entity: "User", entityId: Number(req.params.id) });
  res.status(204).send();
}));
