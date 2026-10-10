import { Request, Response } from "express";
import { asyncHandler } from "../../common/async-handler";
import { auditFrom } from "../../common/audit";
import { AuthRequest } from "../../middlewares/auth";
import { AuthService } from "./auth.service";

const service = new AuthService();
export const login = asyncHandler(async (req: Request, res: Response) => {
  let result;
  try {
    result = await service.login(req.body.username, req.body.password);
  } catch (error) {
    await auditFrom(req, { action: "AUTH_LOGIN_FAILED", entity: "User", metadata: { username: String(req.body.username) } });
    throw error;
  }
  await auditFrom(req, { action: "AUTH_LOGIN", entity: "User", entityId: result.user.id, userId: result.user.id });
  res.json(result);
});
export const refresh = asyncHandler(async (req: Request, res: Response) => res.json(await service.refresh(req.body.refreshToken)));
export const me = asyncHandler(async (req: AuthRequest, res: Response) => res.json(await service.me(req.user!.id)));
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  await auditFrom(req, { action: "AUTH_PASSWORD_CHANGED", entity: "User", entityId: req.user!.id });
  res.status(204).send();
});
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.logout(req.user!.id);
  await auditFrom(req, { action: "AUTH_LOGOUT", entity: "User", entityId: req.user!.id });
  res.status(204).send();
});
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.forgotPassword(req.body.email);
  res.status(202).json({ message: "If the email exists, reset instructions have been sent" });
});
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = await service.resetPassword(req.body.token, req.body.newPassword);
  await auditFrom(req, { action: "AUTH_PASSWORD_RESET", entity: "User", entityId: userId, userId });
  res.status(204).send();
});
