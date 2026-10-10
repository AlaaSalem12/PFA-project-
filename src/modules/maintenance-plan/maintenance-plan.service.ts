import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../common/api-error";
import { pageResponse } from "../../common/pagination";
import { toWorkOrderDto, workOrderInclude } from "../work-order/work-order.dto";
import type { PlanBody, PlanQuery, PlanUpdate } from "./maintenance-plan.schemas";

const DAY_MS = 24 * 60 * 60 * 1000;
type Tx = Prisma.TransactionClient;

const planInclude = { machine: { select: { id: true, code: true, name: true } } } satisfies Prisma.MaintenancePlanInclude;
type PlanRow = Prisma.MaintenancePlanGetPayload<{ include: typeof planInclude }>;

export const toPlanDto = (plan: PlanRow) => ({
  id: plan.id,
  machine: plan.machine,
  task: plan.task,
  frequencyDays: plan.frequencyDays,
  nextDueDate: plan.nextDueDate,
});

const assertMachine = async (machineId: number) => {
  const machine = await prisma.machine.findFirst({ where: { id: machineId, deletedAt: null } });
  if (!machine) throw new ApiError(404, "Machine not found", [], "NOT_FOUND");
  return machine;
};

/** A machine's next maintenance date follows its earliest plan (machines without plans keep their own date). */
const syncMachineDueDate = async (tx: Tx, machineId: number): Promise<void> => {
  const earliest = await tx.maintenancePlan.aggregate({ where: { machineId }, _min: { nextDueDate: true } });
  if (earliest._min.nextDueDate) {
    await tx.machine.update({ where: { id: machineId }, data: { nextMaintenanceDueAt: earliest._min.nextDueDate } });
  }
};

export class MaintenancePlanService {
  async list(query: PlanQuery) {
    const where: Prisma.MaintenancePlanWhereInput = {
      machine: { deletedAt: null },
      ...(query.machineId ? { machineId: query.machineId } : {}),
    };
    const [content, total] = await prisma.$transaction([
      prisma.maintenancePlan.findMany({
        where, include: planInclude, orderBy: [{ nextDueDate: "asc" }, { id: "asc" }],
        skip: query.page * query.size, take: query.size,
      }),
      prisma.maintenancePlan.count({ where }),
    ]);
    return pageResponse(content.map(toPlanDto), total, query.page, query.size);
  }

  /** Plans due within `days` days, including overdue ones. */
  async due(days: number) {
    const horizon = new Date(Date.now() + days * DAY_MS);
    const plans = await prisma.maintenancePlan.findMany({
      where: { machine: { deletedAt: null }, nextDueDate: { lte: horizon } },
      include: planInclude, orderBy: { nextDueDate: "asc" }, take: 200,
    });
    return plans.map(toPlanDto);
  }

  private async find(id: number) {
    const plan = await prisma.maintenancePlan.findFirst({ where: { id, machine: { deletedAt: null } }, include: planInclude });
    if (!plan) throw new ApiError(404, "Maintenance plan not found", [], "NOT_FOUND");
    return plan;
  }

  async get(id: number) {
    return toPlanDto(await this.find(id));
  }

  async create(input: PlanBody, actorId: number) {
    await assertMachine(input.machineId);
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenancePlan.create({ data: { ...input, createdById: actorId }, include: planInclude });
      await syncMachineDueDate(tx, created.machineId);
      return created;
    });
    return toPlanDto(plan);
  }

  async update(id: number, input: PlanUpdate) {
    const current = await this.find(id);
    if (input.machineId) await assertMachine(input.machineId);
    const plan = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenancePlan.update({ where: { id }, data: input, include: planInclude });
      await syncMachineDueDate(tx, updated.machineId);
      if (updated.machineId !== current.machine.id) await syncMachineDueDate(tx, current.machine.id);
      return updated;
    });
    return toPlanDto(plan);
  }

  async remove(id: number) {
    const current = await this.find(id);
    await prisma.$transaction(async (tx) => {
      await tx.maintenancePlan.delete({ where: { id } });
      await syncMachineDueDate(tx, current.machine.id);
    });
  }

  /** Opens a PREVENTIVE work order for the plan and moves the plan's next due date forward, atomically. */
  async generate(id: number, actorId: number) {
    const plan = await this.find(id);
    const machine = await assertMachine(plan.machine.id);
    if (machine.maintenanceStatus === "OUT_OF_SERVICE") {
      throw new ApiError(409, "Cannot create a work order for an out-of-service machine", [], "CONFLICT");
    }
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.workOrder.create({
        data: { machineId: machine.id, type: "PREVENTIVE", priority: "MEDIUM", description: plan.task, createdById: actorId },
        include: workOrderInclude,
      });
      // Overdue plans restart from today so the next date is always in the future.
      const base = Math.max(plan.nextDueDate.getTime(), Date.now());
      await tx.maintenancePlan.update({ where: { id }, data: { nextDueDate: new Date(base + plan.frequencyDays * DAY_MS) } });
      await syncMachineDueDate(tx, machine.id);
      return created;
    });
    return toWorkOrderDto(order);
  }
}
