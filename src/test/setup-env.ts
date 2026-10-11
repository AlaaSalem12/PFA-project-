// Loaded by Jest (setupFiles) before any module, so config/env.ts sees a complete, isolated environment.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-access-secret-that-is-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-at-least-32-characters";
process.env.CORS_ORIGIN = "http://localhost:4200,http://127.0.0.1:4200";
process.env.UPLOADS_DIR = require("node:path").join(require("node:os").tmpdir(), "metalhr-test-uploads");
// Empty (not deleted): dotenv never overrides a variable that is already set, so a local .env with a real
// SMTP server or LLM key can never leak into the tests. Tests must never call a real LLM.
process.env.SMTP_HOST = "";
process.env.LLM_BASE_URL = "";
process.env.LLM_MODEL = "";
process.env.LLM_API_KEY = "";
