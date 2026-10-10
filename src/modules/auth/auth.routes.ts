import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { changePassword, forgotPassword, login, logout, me, refresh, resetPassword } from "./auth.controller";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, refreshSchema, resetPasswordSchema } from "./auth.schemas";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env";

export const authRouter = Router();
authRouter.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: env.NODE_ENV === "test" ? 10_000 : 20, standardHeaders: "draft-8", legacyHeaders: false }));
authRouter.post("/login", validate({ body: loginSchema }), login);
authRouter.post("/refresh", validate({ body: refreshSchema }), refresh);
authRouter.post("/change-password", authenticate, validate({ body: changePasswordSchema }), changePassword);
authRouter.get("/me", authenticate, me);
authRouter.post("/logout", authenticate, logout);
authRouter.post("/forgot-password", validate({ body: forgotPasswordSchema }), forgotPassword);
authRouter.post("/reset-password", validate({ body: resetPasswordSchema }), resetPassword);
