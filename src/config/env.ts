import "dotenv/config";
import { z } from "zod";

const placeholder = /^replace-with/i;
const secret = z.string().min(32);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8081),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: secret,
  JWT_REFRESH_SECRET: secret,
  CORS_ORIGIN: z.string().default("http://localhost:4200,http://localhost:5173,http://localhost:3000"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),
  // Legacy names, still accepted so existing .env files keep working.
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  APP_URL: z.string().url().optional(),
  SEED_ADMIN_USERNAME: z.string().default("admin"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Admin@123"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@metal.local"),
}).superRefine((value, context) => {
  if (value.NODE_ENV !== "production") return;
  for (const key of ["JWT_SECRET", "JWT_REFRESH_SECRET"] as const) {
    if (placeholder.test(value[key])) {
      context.addIssue({ code: "custom", path: [key], message: "Placeholder secret is not allowed in production" });
    }
  }
}).transform((value) => ({
  ...value,
  SMTP_PASSWORD: value.SMTP_PASSWORD ?? value.SMTP_PASS,
  SMTP_FROM: value.SMTP_FROM ?? value.MAIL_FROM,
  FRONTEND_URL: value.FRONTEND_URL ?? value.APP_URL ?? "http://localhost:4200",
}));

export const env = envSchema.parse(process.env);
