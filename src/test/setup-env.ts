// Loaded by Jest (setupFiles) before any module, so config/env.ts sees a complete, isolated environment.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-access-secret-that-is-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-at-least-32-characters";
process.env.CORS_ORIGIN = "http://localhost:4200,http://127.0.0.1:4200";
process.env.UPLOADS_DIR = require("node:path").join(require("node:os").tmpdir(), "metalhr-test-uploads");
delete process.env.SMTP_HOST;
