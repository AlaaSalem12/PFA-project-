import { z } from "zod";

const idParam = z.coerce.number().int().positive();
export const idSchema = z.object({ id: idParam });

export const workOrderTypeSchema = z.enum(["PREVENTIVE", "CORRECTIVE"]);
export const workOrderPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const workOrderStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "DONE"]);

const paging = {
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
};

// ---- Maintenance plans
export const planBodySchema = z.object({
  machineId: z.number().int().positive(),
  task: z.string().trim().min(1).max(500),
  frequencyDays: z.number().int().min(1).max(3650),
  nextDueDate: z.coerce.date(),
});
export const planUpdateSchema = planBodySchema.omit({ machineId: true }).partial();
export const planQuerySchema = z.object({
  ...paging,
  machineId: idParam.optional(),
  overdue: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

// ---- Work orders
export const workOrderBodySchema = z.object({
  machineId: z.number().int().positive(),
  type: workOrderTypeSchema,
  priority: workOrderPrioritySchema.default("MEDIUM"),
  assignedToId: z.number().int().positive().optional(),
  description: z.string().trim().max(5000).optional(),
  partsUsed: z.string().trim().max(2000).optional(),
  cost: z.number().nonnegative().optional(),
});
export const workOrderUpdateSchema = z.object({
  priority: workOrderPrioritySchema,
  assignedToId: z.number().int().positive().nullable(),
  description: z.string().trim().max(5000),
  partsUsed: z.string().trim().max(2000),
  cost: z.number().nonnegative(),
}).partial();
export const workOrderStatusBodySchema = z.object({
  status: workOrderStatusSchema,
  cost: z.number().nonnegative().optional(),
  partsUsed: z.string().trim().max(2000).optional(),
});
export const workOrderQuerySchema = z.object({
  ...paging,
  sort: z.string().regex(/^[A-Za-z]+,(asc|desc)$/).default("openedAt,desc"),
  status: workOrderStatusSchema.optional(),
  type: workOrderTypeSchema.optional(),
  priority: workOrderPrioritySchema.optional(),
  machineId: idParam.optional(),
  assignedToId: idParam.optional(),
});

export type PlanBody = z.infer<typeof planBodySchema>;
export type PlanUpdate = z.infer<typeof planUpdateSchema>;
export type WorkOrderBody = z.infer<typeof workOrderBodySchema>;
export type WorkOrderUpdate = z.infer<typeof workOrderUpdateSchema>;
export type WorkOrderQuery = z.infer<typeof workOrderQuerySchema>;
export type PlanQuery = z.infer<typeof planQuerySchema>;
