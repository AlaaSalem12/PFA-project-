import { Prisma, Role, WorkOrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../common/api-error";
import { pageResponse } from "../../common/pagination";
import { toWorkOrderDto, workOrderInclude } from "./work-order.dto";
import type { CreateWorkOrderInput, UpdateWorkOrderInput, WorkOrderQuery, WorkOrderStatusInput } from "./work-order.schemas";

export type Actor = { id: number; role: Role; employeeId: number | null };

const TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["OPEN", "DONE"],
  DONE: [],
};
const SORTABLE = ["id", "openedAt", "closedAt", "priority", "status", "type"];

type Tx = Prisma.TransactionClient;

const fieldError = (field: string, message: string) =>
  new ApiError(400, message, [{ field, message }], "VALIDATION_ERROR");

const shorten = (text: string | null | undefined): string => {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > 80 ? `${flat.slice(0, 77)}...` : flat;
};

/** Assignee must be an ACTIVE, non-deleted employee. */
const assertAssignee = async (employeeId: number): Promise<void> => {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null, status: "ACTIVE" } });
  if (!employee) throw fieldError("assignedToId", "Assignee must be an active employee");
};

/** Notifies the user account linked to the assignee, if there is one. */
const notifyAssignee = async (
  tx: Tx,
  order: { id: number; priority: string; description: string | null },
  machine: { id: number; code: string },
  employeeId: number,
): Promise<void> => {
  const user = await tx.user.findFirst({ where: { employeeId, enabled: true, deletedAt: null }, select: { id: true } });
  if (!user) return;
  await tx.notification.create({
    data: {
      userId: user.id,
      type: "WORK_ORDER_ASSIGNED",
      title: `New work order #${order.id}`,
      message: `${machine.code} – ${order.priority} – ${shorten(order.description)}`,
      machineId: machine.id,
      workOrderId: order.id,
    },
  });
};

export class WorkOrderService {
  async list(query: WorkOrderQuery, actor: Actor) {
    // EMPLOYEE only ever sees the work orders assigned to them.
    const mine = query.mine === true || actor.role === Role.EMPLOYEE;
    if (mine && !actor.employeeId) return pageResponse([], 0, query.page, query.size);
    const [field, direction] = query.sort.split(",");
    const where: Prisma.WorkOrderWhereInput = {
      machine: { deletedAt: null },
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.machineId ? { machineId: query.machineId } : {}),
      ...(mine ? { assignedToId: actor.employeeId! } : query.assignedToId ? { assignedToId: query.assignedToId } : {}),
    };
    const [content, total] = await prisma.$transaction([
      prisma.workOrder.findMany({
        where, include: workOrderInclude, skip: query.page * query.size, take: query.size,
        orderBy: { [SORTABLE.includes(field) ? field : "openedAt"]: direction as Prisma.SortOrder },
      }),
      prisma.workOrder.count({ where }),
    ]);
    return pageResponse(content.map(toWorkOrderDto), total, query.page, query.size);
  }

  private async find(id: number) {
    const order = await prisma.workOrder.findFirst({ where: { id, machine: { deletedAt: null } }, include: workOrderInclude });
    if (!order) throw new ApiError(404, "Work order not found", [], "NOT_FOUND");
    return order;
  }

  async get(id: number, actor: Actor) {
    const order = await this.find(id);
    if (actor.role === Role.EMPLOYEE && (!actor.employeeId || order.assignedTo?.id !== actor.employeeId)) {
      throw new ApiError(403, "You can only view work orders assigned to you", [], "FORBIDDEN");
    }
    return toWorkOrderDto(order);
  }

  async create(input: CreateWorkOrderInput, actorId: number) {
    const machine = await prisma.machine.findFirst({ where: { id: input.machineId, deletedAt: null } });
    if (!machine) throw new ApiError(404, "Machine not found", [], "NOT_FOUND");
    if (machine.maintenanceStatus === "OUT_OF_SERVICE") {
      throw new ApiError(409, "Cannot create a work order for an out-of-service machine", [], "CONFLICT");
    }
    const assignedToId = input.assignedToId ?? null;
    if (assignedToId) await assertAssignee(assignedToId);
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.workOrder.create({
        data: {
          machineId: machine.id, type: input.type, priority: input.priority,
          description: input.description, assignedToId, createdById: actorId,
        },
        include: workOrderInclude,
      });
      if (assignedToId) await notifyAssignee(tx, created, machine, assignedToId);
      return created;
    });
    return toWorkOrderDto(order);
  }

  async update(id: number, input: UpdateWorkOrderInput) {
    const current = await this.find(id);
    if (current.status === "DONE") throw new ApiError(409, "A completed work order cannot be modified", [], "CONFLICT");
    if (input.assignedToId) await assertAssignee(input.assignedToId);
    const reassigned = input.assignedToId !== undefined && input.assignedToId !== null
      && input.assignedToId !== current.assignedTo?.id;
    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        where: { id },
        data: {
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.description ? { description: input.description } : {}),
          ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
        },
        include: workOrderInclude,
      });
      if (reassigned) await notifyAssignee(tx, updated, current.machine, input.assignedToId!);
      return updated;
    });
    return toWorkOrderDto(order);
  }

  async changeStatus(id: number, input: WorkOrderStatusInput) {
    const current = await this.find(id);
    if (!TRANSITIONS[current.status].includes(input.status)) {
      throw new ApiError(409, `Invalid transition from ${current.status} to ${input.status}`, [], "CONFLICT");
    }
    if (input.status === "DONE" && !input.resolution) {
      throw fieldError("resolution", "A resolution is required to close a work order");
    }
    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.cost !== undefined ? { cost: input.cost } : {}),
          ...(input.partsUsed !== undefined ? { partsUsed: input.partsUsed } : {}),
          ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
          ...(input.status === "DONE" ? { closedAt: new Date() } : {}),
        },
        include: workOrderInclude,
      });
      if (input.status === "DONE" && current.type === "PREVENTIVE") {
        await tx.machine.update({ where: { id: current.machine.id }, data: { lastMaintenanceAt: new Date() } });
      }
      return updated;
    });
    return { order: toWorkOrderDto(order), from: current.status };
  }
}
