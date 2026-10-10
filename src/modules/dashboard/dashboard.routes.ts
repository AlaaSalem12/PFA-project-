import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../common/async-handler";
import { toMachineDtos } from "../machine/machine.dto";
import { authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, requirePasswordChange, authorize(Role.ADMIN));
dashboardRouter.get("/", asyncHandler(async (_req, res) => {
  const [totalUsers, activeUsers, disabledUsers, lockedUsers, neverLoggedIn, byRole, totalMachines, byStatus, byType, overdueMaintenance, machinesInBreakdown, recentStatusChanges, recentLogins, recentlyCreated] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, enabled: true } }),
    prisma.user.count({ where: { deletedAt: null, enabled: false } }),
    prisma.user.count({ where: { deletedAt: null, lockedUntil: { gt: new Date() } } }),
    prisma.user.count({ where: { deletedAt: null, lastLoginAt: null } }),
    prisma.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.machine.count({ where: { deletedAt: null } }),
    prisma.machine.groupBy({ by: ["maintenanceStatus"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.machine.groupBy({ by: ["type"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.machine.count({ where: { deletedAt: null, nextMaintenanceDueAt: { lt: new Date() } } }),
    prisma.machine.findMany({ where: { deletedAt: null, maintenanceStatus: "BREAKDOWN" }, orderBy: { updatedAt: "desc" } }),
    prisma.machineStatusLog.findMany({
      take: 10, orderBy: { changedAt: "desc" },
      include: { machine: { select: { id: true, code: true, name: true } }, changedBy: { select: { id: true, username: true, fullName: true } } },
    }),
    prisma.user.findMany({ where: { lastLoginAt: { not: null }, deletedAt: null }, take: 10, orderBy: { lastLoginAt: "desc" }, select: { id: true, username: true, fullName: true, lastLoginAt: true } }),
    prisma.user.findMany({ where: { deletedAt: null }, take: 5, orderBy: { createdAt: "desc" }, select: { id: true, username: true, fullName: true, createdAt: true } }),
  ]);
  res.json({
    users: {
      total: totalUsers, active: activeUsers, disabled: disabledUsers, locked: lockedUsers,
      neverLoggedIn, byRole, newUsersPerMonth: [],
      recentLogins, recentlyCreated,
    },
    machines: {
      total: totalMachines, byStatus, byType, overdueMaintenance, recentStatusChanges, machinesInBreakdown: toMachineDtos(machinesInBreakdown),
    },
  });
}));
