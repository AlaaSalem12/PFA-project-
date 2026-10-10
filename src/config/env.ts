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
  UPLOADS_DIR: z.string().default("uploads"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  SEED_ADMIN_USERNAME: z.string().default("admin"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Demo@1234"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@metal.local"),
}).superRefine((value, context) => {
  if (value.NODE_ENV !== "production") return;
  for (const key of ["JWT_SECRET", "JWT_REFRESH_SECRET"] as const) {
    if (placeholder.test(value[key])) {
      context.addIssue({ code: "custom", path: [key], message: "Placeholder secret is not allowed in production" });
    }
  }
});

export const env = envSchema.parse(process.env);
