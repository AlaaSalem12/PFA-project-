import express from "express";
import { uploadsRoot } from "./modules/machine/machine-image";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { authRouter } from "./modules/auth/auth.routes";
import { departmentRouter, positionRouter } from "./modules/organization/organization.routes";
import { employeeRouter } from "./modules/employee/employee.routes";
import { userRouter } from "./modules/users/user.routes";
import { machineRouter, maintenanceOverdueHandler } from "./modules/machine/machine.routes";
import { authenticate, requirePasswordChange } from "./middlewares/auth";
import { notificationRouter } from "./modules/notifications/notification.routes";
import { dashboardRouter, myDashboardRouter } from "./modules/dashboard/dashboard.routes";
import { auditRouter } from "./modules/audit/audit.routes";
import { workOrderRouter } from "./modules/work-order/work-order.routes";
import { maintenancePlanRouter } from "./modules/maintenance-plan/maintenance-plan.routes";
import { assistantRouter } from "./modules/assistant/assistant.routes";
import { rateLimitHandler } from "./common/rate-limit";
import { ApiError } from "./common/api-error";

export const app = express();
app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new ApiError(403, "Origin not allowed", [], "CORS_REJECTED"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, limit: env.NODE_ENV === "test" ? 10_000 : 1000,
  standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler,
}));
app.use("/uploads", express.static(uploadsRoot, { maxAge: "7d" }));
app.use(express.json());
app.use(morgan("combined"));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/positions", positionRouter);
app.use("/api/v1/employees", employeeRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/machines", machineRouter);
app.get("/api/v1/maintenance/overdue", authenticate, requirePasswordChange, maintenanceOverdueHandler);
app.use("/api/v1/work-orders", workOrderRouter);
app.use("/api/v1/maintenance-plans", maintenancePlanRouter);
app.use("/api/v1/assistant", assistantRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/admin/dashboard", dashboardRouter);
app.use("/api/v1/dashboard", myDashboardRouter);
app.use("/api/v1/admin/audit-logs", auditRouter);
app.use(notFoundHandler);
app.use(errorHandler);
