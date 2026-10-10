import { Router } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/async-handler";
import { auditRequest } from "../../common/audit";
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
  await auditRequest(req, "CREATE", "User", result.user.id, { username: result.user.username, role: result.user.role });
  res.status(201).json(result);
}));
userRouter.get("/:id", validate({ params: userIdSchema }), asyncHandler(async (req, res) => {
  res.json(await service.get(Number(req.params.id)));
}));
userRouter.put("/:id", validate({ params: userIdSchema, body: updateUserSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const user = await service.update(Number(req.params.id), req.body, req.user!.id);
  await auditRequest(req, "UPDATE", "User", user.id, { fields: Object.keys(req.body) });
  res.json(user);
}));
userRouter.patch("/:id/enabled", validate({ params: userIdSchema, body: enabledSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const user = await service.setEnabled(Number(req.params.id), req.body.enabled, req.user!.id);
  await auditRequest(req, req.body.enabled ? "ENABLE" : "DISABLE", "User", user.id);
  res.json(user);
}));
const resetCredentials = asyncHandler(async (req: AuthRequest, res) => {
  const result = await service.resetPassword(Number(req.params.id));
  await auditRequest(req, "RESET_PASSWORD", "User", result.user.id, { emailSent: result.emailSent });
  res.json(result);
});
userRouter.post("/:id/reset-password", validate({ params: userIdSchema }), resetCredentials);
userRouter.post("/:id/resend-credentials", validate({ params: userIdSchema }), resetCredentials);
userRouter.delete("/:id", validate({ params: userIdSchema }), asyncHandler(async (req: AuthRequest, res) => {
  await service.remove(Number(req.params.id), req.user!.id);
  await auditRequest(req, "DELETE", "User", Number(req.params.id));
  res.status(204).send();
}));
