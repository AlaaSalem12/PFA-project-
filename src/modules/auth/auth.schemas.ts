import { z } from "zod";
import { passwordSchema } from "../../common/password-policy";

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
export const forgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.string().email()) });
export const resetPasswordSchema = z.object({ token: z.string().min(20), newPassword: passwordSchema });
