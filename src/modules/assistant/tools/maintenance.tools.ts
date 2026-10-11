import { Role, WorkOrderPriority, WorkOrderStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../../config/prisma";
import { MaintenancePlanService } from "../../maintenance-plan/maintenance-plan.service";
import { WorkOrderService } from "../../work-order/work-order.service";
import { defineTool } from "./define-tool";

const workOrders = new WorkOrderService();
const plans = new MaintenancePlanService();

export const maintenanceTools = [
  defineTool({
    name: "list_work_orders",
    description: "List maintenance work orders, newest first. "
      + `Arguments (all optional): status = one of ${Object.values(WorkOrderStatus).join(", ")}; priority = one of ${Object.values(WorkOrderPriority).join(", ")}; `
      + "machineCode = a machine code such as \"FURN-001\"; mine = true to only list work orders assigned to the current user. "
      + "Employees always only see their own work orders. Returns the total and up to 20 orders (reference like \"#12\", machine code, type, priority, status, assignee, opened/closed dates).",
    roles: Object.values(Role),
    args: z.object({
      status: z.enum(WorkOrderStatus).optional(),
      priority: z.enum(WorkOrderPriority).optional(),
      machineCode: z.string().trim().min(1).max(50).optional(),
      mine: z.boolean().optional(),
    }),
    handler: async (ctx, args) => {
      let machineId: number | undefined;
      if (args.machineCode) {
        const machine = await prisma.machine.findFirst({
          where: { deletedAt: null, code: { equals: args.machineCode, mode: "insensitive" } }, select: { id: true },
        });
        if (!machine) return { found: false, message: `No machine with code ${args.machineCode}` };
        machineId = machine.id;
      }
      // The service forces `mine` for EMPLOYEE whatever the model asks for.
      const page = await workOrders.list(
        { page: 0, size: 50, sort: "openedAt,desc", status: args.status, priority: args.priority, machineId, mine: args.mine },
        { id: ctx.user.id, role: ctx.user.role, employeeId: ctx.user.employeeId },
      );
      return {
        total: page.totalElements,
        workOrders: page.content.map((order) => ({
          ref: `#${order.id}`, machine: order.machine.code, type: order.type, priority: order.priority, status: order.status,
          description: order.description,
          assignee: order.assignedTo ? `${order.assignedTo.firstName} ${order.assignedTo.lastName}` : null,
          openedAt: order.openedAt.toISOString(), closedAt: order.closedAt ? order.closedAt.toISOString() : null,
        })),
      };
    },
  }),

  defineTool({
    name: "get_maintenance_plans_due",
    description: "Preventive maintenance plans due within the next N days, including overdue ones, soonest first. "
      + "Argument: days = 1 to 60 (default 14). Returns machine code, task, next due date, frequency in days and whether it is overdue.",
    roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.MAINTENANCE_TECH, Role.HR_MANAGER],
    args: z.object({ days: z.number().int().min(1).max(60).default(14) }),
    handler: async (_ctx, args) => {
      const today = new Date().toISOString().slice(0, 10);
      const due = await plans.due(args.days);
      return {
        days: args.days,
        plans: due.map((plan) => {
          const nextDueDate = plan.nextDueDate.toISOString().slice(0, 10);
          return {
            machine: plan.machine.code, machineName: plan.machine.name, task: plan.task,
            nextDueDate, frequencyDays: plan.frequencyDays, overdue: nextDueDate < today,
          };
        }),
      };
    },
  }),
];
