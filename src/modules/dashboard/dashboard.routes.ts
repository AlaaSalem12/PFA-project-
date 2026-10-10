import { Router } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/async-handler";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { DashboardService } from "./dashboard.service";

const service = new DashboardService();

/** Mounted at /api/v1/admin/dashboard (ADMIN). */
export const dashboardRouter = Router();
dashboardRouter.use(authenticate, requirePasswordChange, authorize(Role.ADMIN));
dashboardRouter.get("/", asyncHandler(async (_req, res) => res.json(await service.admin())));

/** Mounted at /api/v1/dashboard (every authenticated role): GET /me. */
export const myDashboardRouter = Router();
myDashboardRouter.use(authenticate, requirePasswordChange);
myDashboardRouter.get("/me", asyncHandler(async (req: AuthRequest, res) => {
  const user = req.user!;
  res.json(await service.me({ id: user.id, role: user.role, employeeId: user.employeeId }));
}));
