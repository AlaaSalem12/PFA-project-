import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { changePassword, forgotPassword, login, logout, me, refresh, resetPassword } from "./auth.controller";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, refreshSchema, resetPasswordSchema } from "./auth.schemas";
import rateLimit from "express-rate-limit";
import { rateLimitHandler } from "../../common/rate-limit";
import { env } from "../../config/env";

export const authRouter = Router();
// Keyed per client IP by the library's default key generator, which also groups IPv6 addresses
// by subnet so an attacker cannot rotate addresses inside their IPv6 block to bypass the limit.
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: env.NODE_ENV === "test" ? 10_000 : 10,
  standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler,
});
authRouter.post("/login", strictAuthLimiter, validate({ body: loginSchema }), login);
authRouter.post("/refresh", validate({ body: refreshSchema }), refresh);
authRouter.post("/change-password", authenticate, validate({ body: changePasswordSchema }), changePassword);
authRouter.get("/me", authenticate, me);
authRouter.post("/logout", authenticate, logout);
authRouter.post("/forgot-password", strictAuthLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
authRouter.post("/reset-password", strictAuthLimiter, validate({ body: resetPasswordSchema }), resetPassword);
