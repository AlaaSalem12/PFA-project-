import { MachineType, MaintenanceStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../../config/prisma";
import { MachineService } from "../../machine/machine.service";
import { defineTool } from "./define-tool";

const ALL_ROLES = Object.values(Role);
const DAY_MS = 24 * 60 * 60 * 1000;
const machines = new MachineService();

const machineCode = z.string().trim().min(1).max(50)
  .describe('Machine code exactly as shown in the app, for example "CNC-001" or "FURN-001".');

const findByCode = (code: string) =>
  prisma.machine.findFirst({ where: { deletedAt: null, code: { equals: code, mode: "insensitive" } } });

const day = (date: Date | null | undefined): string | null => (date ? date.toISOString().slice(0, 10) : null);

export const machineTools = [
  defineTool({
    name: "search_machines",
    description: "List machines, optionally filtered. Use it for questions like \"which machines are broken down\", \"list the CNC machines\" or \"machines in the Welding workshop\". "
      + `Arguments (all optional): query = text matched against machine code, name or serial number; status = one of ${Object.values(MaintenanceStatus).join(", ")} `
      + `(BREAKDOWN means broken down / en panne); type = one of ${Object.values(MachineType).join(", ")}; location = workshop name such as "Machining", "Production", "Welding", "Foundry". `
      + "Returns the total count and up to 20 machines with code, name, type, status, location and next maintenance date.",
    roles: ALL_ROLES,
    args: z.object({
      query: z.string().trim().max(100).optional(),
      status: z.enum(MaintenanceStatus).optional(),
      type: z.enum(MachineType).optional(),
      location: z.string().trim().max(100).optional(),
    }),
    handler: async (_ctx, args) => {
      const page = await machines.list({
        page: 0, size: 50, search: args.query ?? "", sort: "code,asc",
        status: args.status, type: args.type, location: args.location,
      });
      return {
        total: page.totalElements,
        machines: page.content.map((machine) => ({
          code: machine.code, name: machine.name, type: machine.type, status: machine.maintenanceStatus,
          location: machine.location, nextMaintenanceDueAt: day(machine.nextMaintenanceDueAt),
        })),
      };
    },
  }),

  defineTool({
    name: "get_machine",
    description: "Full details of ONE machine identified by its code (e.g. \"CNC-001\"): specifications, status, maintenance dates, the last 5 status changes, "
      + "the number of open work orders and the names of the authorized operators. Use search_machines first if you do not know the code.",
    roles: ALL_ROLES,
    args: z.object({ code: machineCode }),
    handler: async (_ctx, args) => {
      const machine = await findByCode(args.code);
      if (!machine) return { found: false, message: `No machine with code ${args.code}` };
      const [history, openWorkOrders, operators] = await Promise.all([
        prisma.machineStatusLog.findMany({
          where: { machineId: machine.id }, orderBy: { changedAt: "desc" }, take: 5,
          include: { changedBy: { select: { fullName: true } } },
        }),
        prisma.workOrder.count({ where: { machineId: machine.id, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.employee.findMany({
          where: { deletedAt: null, authorizedMachines: { some: { id: machine.id } } },
          select: { firstName: true, lastName: true }, orderBy: { lastName: "asc" },
        }),
      ]);
      return {
        found: true,
        code: machine.code, name: machine.name, type: machine.type, status: machine.maintenanceStatus,
        brand: machine.brand, model: machine.model, serialNumber: machine.serialNumber,
        purchaseDate: day(machine.purchaseDate), workshop: machine.workshop, location: machine.location,
        hourlyCost: machine.hourlyCost === null ? null : Number(machine.hourlyCost),
        operatingHours: Number(machine.operatingHours),
        maintenanceIntervalDays: machine.maintenanceIntervalDays,
        lastMaintenanceAt: day(machine.lastMaintenanceAt), nextMaintenanceDueAt: day(machine.nextMaintenanceDueAt),
        notes: machine.notes,
        openWorkOrders,
        authorizedOperators: operators.map((operator) => `${operator.firstName} ${operator.lastName}`),
        recentStatusChanges: history.map((entry) => ({
          from: entry.fromStatus, to: entry.toStatus, comment: entry.comment,
          changedAt: entry.changedAt.toISOString(), by: entry.changedBy.fullName,
        })),
      };
    },
  }),

  defineTool({
    name: "get_fleet_summary",
    description: "Counts for the whole machine fleet: total machines, how many per status (OPERATIONAL, SCHEDULED_MAINTENANCE, UNDER_MAINTENANCE, BREAKDOWN, OUT_OF_SERVICE), "
      + "how many per type, and how many have overdue maintenance. Use it for \"how many machines…\" questions. No arguments.",
    roles: ALL_ROLES,
    args: z.object({}),
    handler: async () => {
      const [total, byStatus, byType, overdue] = await Promise.all([
        prisma.machine.count({ where: { deletedAt: null } }),
        prisma.machine.groupBy({ by: ["maintenanceStatus"], where: { deletedAt: null }, _count: { _all: true } }),
        prisma.machine.groupBy({ by: ["type"], where: { deletedAt: null }, _count: { _all: true } }),
        prisma.machine.count({ where: { deletedAt: null, nextMaintenanceDueAt: { lt: new Date() } } }),
      ]);
      const statusCounts = new Map(byStatus.map((row) => [row.maintenanceStatus, row._count._all]));
      return {
        total,
        byStatus: Object.fromEntries(Object.values(MaintenanceStatus).map((status) => [status, statusCounts.get(status) ?? 0])),
        byType: Object.fromEntries(byType.map((row) => [row.type, row._count._all])),
        overdueMaintenance: overdue,
      };
    },
  }),

  defineTool({
    name: "get_overdue_maintenance",
    description: "Machines whose next maintenance date is already past, with the number of days overdue, most overdue first. No arguments.",
    roles: ALL_ROLES,
    args: z.object({}),
    handler: async () => {
      const now = Date.now();
      const overdue = await machines.overdue();
      return {
        total: overdue.length,
        machines: overdue
          .map((machine) => ({
            code: machine.code, name: machine.name, status: machine.maintenanceStatus,
            nextMaintenanceDueAt: day(machine.nextMaintenanceDueAt),
            daysOverdue: Math.floor((now - machine.nextMaintenanceDueAt!.getTime()) / DAY_MS),
          }))
          .sort((a, b) => b.daysOverdue - a.daysOverdue),
      };
    },
  }),

  defineTool({
    name: "get_machine_history",
    description: "Status change history of ONE machine (newest first): from/to status, comment, date and who made the change. "
      + "Arguments: code = machine code such as \"PRESS-001\"; limit = number of entries, 1 to 20 (default 10).",
    roles: ALL_ROLES,
    args: z.object({ code: machineCode, limit: z.number().int().min(1).max(20).default(10) }),
    handler: async (_ctx, args) => {
      const machine = await findByCode(args.code);
      if (!machine) return { found: false, message: `No machine with code ${args.code}` };
      const history = await prisma.machineStatusLog.findMany({
        where: { machineId: machine.id }, orderBy: { changedAt: "desc" }, take: args.limit,
        include: { changedBy: { select: { fullName: true } } },
      });
      return {
        found: true, code: machine.code, currentStatus: machine.maintenanceStatus,
        changes: history.map((entry) => ({
          from: entry.fromStatus, to: entry.toStatus, comment: entry.comment,
          changedAt: entry.changedAt.toISOString(), by: entry.changedBy.fullName,
        })),
      };
    },
  }),
];
