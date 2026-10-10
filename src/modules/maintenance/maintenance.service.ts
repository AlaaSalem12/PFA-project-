import { Prisma, WorkOrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../common/api-error";
import { pageResponse } from "../../common/pagination";
import type { PlanBody, PlanQuery, PlanUpdate, WorkOrderBody, WorkOrderQuery, WorkOrderUpdate } from "./maintenance.schemas";

const workOrderTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE", "OPEN"],
  DONE: [],
};

const DAY_MS = 24 * 60 * 60 * 1000;
const workOrderInclude = {
  machine: { select: { id: true, code: true, name: true } },
  assignedTo: { select: { id: true, matricule: true, firstName: true, lastName: true } },
} satisfies Prisma.WorkOrderInclude;

type Tx = Prisma.TransactionClient;

const assertMachine = async (machineId: number) => {
  const machine = await prisma.machine.findFirst({ where: { id: machineId, deletedAt: null } });
  if (!machine) throw new ApiError(404, "Machine not found");
  return machine;
};

const assertAssignee = async (employeeId: number) => {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null, status: "ACTIVE" } });
  if (!employee) throw new ApiError(404, "Assignee not found or not active");
};

/** Keeps the machine's next due date equal to its earliest maintenance plan. */
const syncMachineDueDate = async (tx: Tx, machineId: number): Promise<void> => {
  const earliest = await tx.maintenancePlan.aggregate({ where: { machineId }, _min: { nextDueDate: true } });
  if (earliest._min.nextDueDate) {
    await tx.machine.update({ where: { id: machineId }, data: { nextMaintenanceDueAt: earliest._min.nextDueDate } });
  }
};

export class MaintenanceService {
  // ---- Plans
  async listPlans(query: PlanQuery) {
    const where: Prisma.MaintenancePlanWhereInput = {
      machine: { deletedAt: null },
      ...(query.machineId ? { machineId: query.machineId } : {}),
      ...(query.overdue === undefined ? {} : { nextDueDate: query.overdue ? { lt: new Date() } : { gte: new Date() } }),
    };
    const [content, total] = await prisma.$transaction([
      prisma.maintenancePlan.findMany({
        where, orderBy: { nextDueDate: "asc" }, skip: query.page * query.size, take: query.size,
        include: { machine: { select: { id: true, code: true, name: true } } },
      }),
      prisma.maintenancePlan.count({ where }),
    ]);
    return pageResponse(content, total, query.page, query.size);
  }

  async getPlan(id: number) {
    const plan = await prisma.maintenancePlan.findFirst({
      where: { id, machine: { deletedAt: null } },
      include: { machine: { select: { id: true, code: true, name: true } } },
    });
    if (!plan) throw new ApiError(404, "Maintenance plan not found");
    return plan;
  }

  async createPlan(input: PlanBody, actor: string) {
    await assertMachine(input.machineId);
    return prisma.$transaction(async (tx) => {
      const plan = await tx.maintenancePlan.create({ data: { ...input, createdBy: actor } });
      await syncMachineDueDate(tx, plan.machineId);
      return plan;
    });
  }

  async updatePlan(id: number, input: PlanUpdate) {
    const current = await this.getPlan(id);
    return prisma.$transaction(async (tx) => {
      const plan = await tx.maintenancePlan.update({ where: { id }, data: input });
      await syncMachineDueDate(tx, current.machineId);
      return plan;
    });
  }

  async deletePlan(id: number) {
    const current = await this.getPlan(id);
    await prisma.$transaction(async (tx) => {
      await tx.maintenancePlan.delete({ where: { id } });
      await syncMachineDueDate(tx, current.machineId);
    });
  }

  /** Opens a preventive work order for the plan and schedules the next occurrence. */
  async generateWorkOrder(planId: number, actor: string) {
    const plan = await this.getPlan(planId);
    return prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          machineId: plan.machineId, type: "PREVENTIVE", priority: "MEDIUM",
          description: plan.task, createdBy: actor,
        },
        include: workOrderInclude,
      });
      const base = Math.max(plan.nextDueDate.getTime(), Date.now());
      const updatedPlan = await tx.maintenancePlan.update({
        where: { id: planId },
        data: { nextDueDate: new Date(base + plan.frequencyDays * DAY_MS) },
      });
      await syncMachineDueDate(tx, plan.machineId);
      return { workOrder, plan: updatedPlan };
    });
  }

  // ---- Work orders
  async listWorkOrders(query: WorkOrderQuery) {
    const [field, direction] = query.sort.split(",");
    const sortField = ["id", "openedAt", "closedAt", "priority", "status", "type"].includes(field) ? field : "openedAt";
    const where: Prisma.WorkOrderWhereInput = {
      machine: { deletedAt: null },
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.machineId ? { machineId: query.machineId } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
    };
    const [content, total] = await prisma.$transaction([
      prisma.workOrder.findMany({
        where, include: workOrderInclude, skip: query.page * query.size, take: query.size,
        orderBy: { [sortField]: direction as Prisma.SortOrder },
      }),
      prisma.workOrder.count({ where }),
    ]);
    return pageResponse(content, total, query.page, query.size);
  }

  async getWorkOrder(id: number) {
    const order = await prisma.workOrder.findFirst({ where: { id, machine: { deletedAt: null } }, include: workOrderInclude });
    if (!order) throw new ApiError(404, "Work order not found");
    return order;
  }

  async createWorkOrder(input: WorkOrderBody, actor: string) {
    await assertMachine(input.machineId);
    if (input.assignedToId) await assertAssignee(input.assignedToId);
    return prisma.workOrder.create({ data: { ...input, createdBy: actor }, include: workOrderInclude });
  }

  async updateWorkOrder(id: number, input: WorkOrderUpdate) {
    const current = await this.getWorkOrder(id);
    if (current.status === "DONE") throw new ApiError(409, "A completed work order cannot be modified");
    if (input.assignedToId) await assertAssignee(input.assignedToId);
    return prisma.workOrder.update({ where: { id }, data: input, include: workOrderInclude });
  }

  async changeWorkOrderStatus(id: number, status: WorkOrderStatus, extra: { cost?: number; partsUsed?: string }) {
    const current = await this.getWorkOrder(id);
    if (current.status === status) return current;
    if (!workOrderTransitions[current.status].includes(status)) {
      throw new ApiError(409, `Invalid transition from ${current.status} to ${status}`);
    }
    return prisma.$transaction(async (tx) => {
      const order = await tx.workOrder.update({
        where: { id },
        data: { status, closedAt: status === "DONE" ? new Date() : null, ...extra },
        include: workOrderInclude,
      });
      if (status === "DONE" && current.type === "PREVENTIVE") {
        await tx.machine.update({ where: { id: current.machineId }, data: { lastMaintenanceAt: new Date() } });
      }
      return order;
    });
  }

  async deleteWorkOrder(id: number) {
    const current = await this.getWorkOrder(id);
    if (current.status !== "OPEN") throw new ApiError(409, "Only open work orders can be deleted");
    await prisma.workOrder.delete({ where: { id } });
  }
}
