import { Role, WorkOrderPriority } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { toMachineDtos } from "../machine/machine.dto";
import { toWorkOrderDto, workOrderInclude } from "../work-order/work-order.dto";

const PRIORITIES: WorkOrderPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const MONTHS = 6;

const monthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

/** First day (UTC) of each of the last `MONTHS` months, oldest first, current month last. */
const lastMonths = (now: Date): Date[] =>
  Array.from({ length: MONTHS }, (_, index) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1 - index), 1)));

export type Actor = { id: number; role: Role; employeeId: number | null };

export class DashboardService {
  private async newUsersPerMonth(now: Date) {
    const months = lastMonths(now);
    const users = await prisma.user.findMany({
      where: { deletedAt: null, createdAt: { gte: months[0] } },
      select: { createdAt: true },
    });
    const counts = new Map(months.map((month) => [monthKey(month), 0]));
    for (const user of users) {
      const key = monthKey(user.createdAt);
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts].map(([month, count]) => ({ month, count }));
  }

  private async workOrderStats(now: Date) {
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [open, inProgress, doneThisMonth, byPriority] = await Promise.all([
      prisma.workOrder.count({ where: { status: "OPEN", machine: { deletedAt: null } } }),
      prisma.workOrder.count({ where: { status: "IN_PROGRESS", machine: { deletedAt: null } } }),
      prisma.workOrder.count({ where: { status: "DONE", closedAt: { gte: startOfMonth }, machine: { deletedAt: null } } }),
      // Priority breakdown covers the work that still needs doing (OPEN + IN_PROGRESS).
      prisma.workOrder.groupBy({
        by: ["priority"], where: { status: { in: ["OPEN", "IN_PROGRESS"] }, machine: { deletedAt: null } }, _count: { _all: true },
      }),
    ]);
    const counts = new Map(byPriority.map((row) => [row.priority, row._count._all]));
    return {
      open, inProgress, doneThisMonth,
      byPriority: PRIORITIES.map((priority) => ({ priority, count: counts.get(priority) ?? 0 })),
    };
  }

  private async employeeStats() {
    const [total, grouped, departments] = await Promise.all([
      prisma.employee.count({ where: { deletedAt: null } }),
      prisma.employee.groupBy({ by: ["departmentId"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    const counts = new Map(grouped.map((row) => [row.departmentId, row._count._all]));
    const byDepartment = departments.map((department) => ({ department: department.name, count: counts.get(department.id) ?? 0 }));
    const unassigned = counts.get(null) ?? 0;
    if (unassigned > 0) byDepartment.push({ department: "Unassigned", count: unassigned });
    return { total, byDepartment: byDepartment.sort((a, b) => b.count - a.count || a.department.localeCompare(b.department)) };
  }

  async admin() {
    const now = new Date();
    const [
      totalUsers, activeUsers, disabledUsers, lockedUsers, neverLoggedIn, byRole, newUsersPerMonth,
      totalMachines, byStatus, byType, overdueMaintenance, machinesInBreakdown, recentStatusChanges,
      recentLogins, recentlyCreated, workOrders, employees,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, enabled: true } }),
      prisma.user.count({ where: { deletedAt: null, enabled: false } }),
      prisma.user.count({ where: { deletedAt: null, lockedUntil: { gt: now } } }),
      prisma.user.count({ where: { deletedAt: null, lastLoginAt: null } }),
      prisma.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: { _all: true } }),
      this.newUsersPerMonth(now),
      prisma.machine.count({ where: { deletedAt: null } }),
      prisma.machine.groupBy({ by: ["maintenanceStatus"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.machine.groupBy({ by: ["type"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.machine.count({ where: { deletedAt: null, nextMaintenanceDueAt: { lt: now } } }),
      prisma.machine.findMany({ where: { deletedAt: null, maintenanceStatus: "BREAKDOWN" }, orderBy: { updatedAt: "desc" } }),
      prisma.machineStatusLog.findMany({
        take: 10, orderBy: { changedAt: "desc" },
        include: { machine: { select: { id: true, code: true, name: true } }, changedBy: { select: { id: true, username: true, fullName: true } } },
      }),
      prisma.user.findMany({
        where: { lastLoginAt: { not: null }, deletedAt: null }, take: 10, orderBy: { lastLoginAt: "desc" },
        select: { id: true, username: true, fullName: true, lastLoginAt: true },
      }),
      prisma.user.findMany({
        where: { deletedAt: null }, take: 5, orderBy: { createdAt: "desc" },
        select: { id: true, username: true, fullName: true, createdAt: true },
      }),
      this.workOrderStats(now),
      this.employeeStats(),
    ]);
    return {
      users: {
        total: totalUsers, active: activeUsers, disabled: disabledUsers, locked: lockedUsers,
        neverLoggedIn, byRole, newUsersPerMonth, recentLogins, recentlyCreated,
      },
      machines: {
        total: totalMachines, byStatus, byType, overdueMaintenance, recentStatusChanges,
        machinesInBreakdown: toMachineDtos(machinesInBreakdown),
      },
      workOrders,
      employees,
    };
  }

  /** Personal dashboard for any role; the `hr` block is only present for ADMIN and HR_MANAGER. */
  async me(actor: Actor) {
    const now = new Date();
    const wantsHr = actor.role === Role.ADMIN || actor.role === Role.HR_MANAGER;
    const [myOrders, machinesInBreakdown, overdueMaintenance, unreadNotifications, hr] = await Promise.all([
      actor.employeeId
        ? prisma.workOrder.findMany({
          where: { assignedToId: actor.employeeId, status: { in: ["OPEN", "IN_PROGRESS"] }, machine: { deletedAt: null } },
          orderBy: [{ priority: "desc" }, { openedAt: "asc" }], take: 5, include: workOrderInclude,
        })
        : Promise.resolve([]),
      prisma.machine.count({ where: { deletedAt: null, maintenanceStatus: "BREAKDOWN" } }),
      prisma.machine.count({ where: { deletedAt: null, nextMaintenanceDueAt: { lt: now } } }),
      prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
      wantsHr
        ? Promise.all([
          prisma.employee.count({ where: { deletedAt: null } }),
          prisma.employee.count({ where: { deletedAt: null, status: "ON_LEAVE" } }),
        ]).then(([employees, onLeave]) => ({ employees, onLeave }))
        : Promise.resolve(undefined),
    ]);
    return {
      myOpenWorkOrders: myOrders.map(toWorkOrderDto),
      machinesInBreakdown,
      overdueMaintenance,
      unreadNotifications,
      ...(hr ? { hr } : {}),
    };
  }
}
