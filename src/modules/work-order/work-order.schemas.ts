import { WorkOrderPriority, WorkOrderStatus, WorkOrderType } from "@prisma/client";
import { z } from "zod";
import { optionalNumber, optionalText } from "../../common/zod";

export const workOrderTypeSchema = z.enum(WorkOrderType);
export const workOrderPrioritySchema = z.enum(WorkOrderPriority);
export const workOrderStatusSchema = z.enum(WorkOrderStatus);

export const workOrderIdSchema = z.object({ id: z.coerce.number().int().positive() });

const positiveId = z.coerce.number().int().positive();

export const workOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().regex(/^[A-Za-z]+,(asc|desc)$/).default("openedAt,desc"),
  status: workOrderStatusSchema.optional(),
  priority: workOrderPrioritySchema.optional(),
  type: workOrderTypeSchema.optional(),
  machineId: positiveId.optional(),
  assignedToId: positiveId.optional(),
  mine: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

export const createWorkOrderSchema = z.object({
  machineId: z.number().int().positive(),
  type: workOrderTypeSchema,
  priority: workOrderPrioritySchema.default("MEDIUM"),
  description: z.string().trim().min(1).max(5000),
  assignedToId: z.number().int().positive().nullish(),
});

export const updateWorkOrderSchema = z.object({
  priority: workOrderPrioritySchema.optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
});

export const workOrderStatusBodySchema = z.object({
  status: workOrderStatusSchema,
  cost: optionalNumber,
  partsUsed: optionalText(2000),
  resolution: optionalText(5000),
}).superRefine((value, context) => {
  if (value.status === "DONE" && !value.resolution) {
    context.addIssue({ code: "custom", path: ["resolution"], message: "A resolution is required to close a work order" });
  }
});

export type WorkOrderQuery = z.infer<typeof workOrderQuerySchema>;
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type WorkOrderStatusInput = z.infer<typeof workOrderStatusBodySchema>;
