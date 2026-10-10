import { Request, Response } from "express";
import { asyncHandler } from "../../common/async-handler";
import { auditRequest } from "../../common/audit";
import { AuthRequest } from "../../middlewares/auth";
import { AuthService } from "./auth.service";

const service = new AuthService();
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.login(req.body.username, req.body.password);
  await auditRequest(req, "LOGIN", "User", result.user.id, undefined, result.user.id);
  res.json(result);
});
export const refresh = asyncHandler(async (req: Request, res: Response) => res.json(await service.refresh(req.body.refreshToken)));
export const me = asyncHandler(async (req: AuthRequest, res: Response) => res.json(await service.me(req.user!.id)));
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  await auditRequest(req, "CHANGE_PASSWORD", "User", req.user!.id);
  res.status(204).send();
});
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.logout(req.user!.id);
  await auditRequest(req, "LOGOUT", "User", req.user!.id);
  res.status(204).send();
});
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.forgotPassword(req.body.email);
  res.status(202).json({ message: "If the email exists, reset instructions have been sent" });
});
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = await service.resetPassword(req.body.token, req.body.newPassword);
  await auditRequest(req, "RESET_PASSWORD_WITH_TOKEN", "User", userId, undefined, userId);
  res.status(204).send();
});
