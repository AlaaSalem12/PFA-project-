import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../../config/prisma";
import { defineTool } from "./define-tool";

export const accountTools = [
  defineTool({
    name: "get_user_stats",
    description: "Application account statistics (not employees): total accounts, accounts per role, disabled accounts, currently locked accounts and accounts that never logged in. No arguments.",
    roles: [Role.ADMIN],
    args: z.object({}),
    handler: async () => {
      const notDeleted = { deletedAt: null };
      const [total, byRole, disabled, locked, neverLoggedIn] = await Promise.all([
        prisma.user.count({ where: notDeleted }),
        prisma.user.groupBy({ by: ["role"], where: notDeleted, _count: { _all: true } }),
        prisma.user.count({ where: { ...notDeleted, enabled: false } }),
        prisma.user.count({ where: { ...notDeleted, lockedUntil: { gt: new Date() } } }),
        prisma.user.count({ where: { ...notDeleted, lastLoginAt: null } }),
      ]);
      const roleCounts = new Map(byRole.map((row) => [row.role, row._count._all]));
      return {
        total,
        byRole: Object.fromEntries(Object.values(Role).map((role) => [role, roleCounts.get(role) ?? 0])),
        disabled, locked, neverLoggedIn,
      };
    },
  }),

  defineTool({
    name: "get_my_profile",
    description: "Information about the current user: name, username, role, linked employee (matricule, department, position), "
      + "number of open work orders assigned to them and number of unread notifications. Use it for \"who am I\", \"my work orders count\", \"my notifications\". No arguments.",
    roles: Object.values(Role),
    args: z.object({}),
    handler: async (ctx) => {
      const [me, unreadNotifications, openWorkOrders] = await Promise.all([
        prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: {
            fullName: true, username: true, role: true,
            employee: { select: { matricule: true, department: { select: { name: true } }, position: { select: { name: true } } } },
          },
        }),
        prisma.notification.count({ where: { userId: ctx.user.id, readAt: null } }),
        ctx.user.employeeId
          ? prisma.workOrder.count({ where: { assignedToId: ctx.user.employeeId, status: { in: ["OPEN", "IN_PROGRESS"] } } })
          : Promise.resolve(0),
      ]);
      return {
        fullName: me?.fullName ?? null,
        username: me?.username ?? ctx.user.username,
        role: ctx.user.role,
        employee: me?.employee
          ? { matricule: me.employee.matricule, department: me.employee.department?.name ?? null, position: me.employee.position?.name ?? null }
          : null,
        myOpenWorkOrders: openWorkOrders,
        unreadNotifications,
      };
    },
  }),
];
