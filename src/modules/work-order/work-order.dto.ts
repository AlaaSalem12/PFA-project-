import { Prisma } from "@prisma/client";

export const workOrderInclude = {
  machine: { select: { id: true, code: true, name: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.WorkOrderInclude;

type WorkOrderRow = Prisma.WorkOrderGetPayload<{ include: typeof workOrderInclude }>;

/** Contract shape (§5): cost is a JSON number, relations are slim references. */
export const toWorkOrderDto = (order: WorkOrderRow) => ({
  id: order.id,
  machine: order.machine,
  type: order.type,
  priority: order.priority,
  status: order.status,
  description: order.description,
  assignedTo: order.assignedTo,
  openedAt: order.openedAt,
  closedAt: order.closedAt,
  cost: order.cost === null ? null : Number(order.cost),
  partsUsed: order.partsUsed,
  resolution: order.resolution,
  createdBy: order.createdBy,
});
