import { z } from "zod";

export const planIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const planBodySchema = z.object({
  machineId: z.number().int().positive(),
  task: z.string().trim().min(1).max(500),
  frequencyDays: z.number().int().min(1).max(3650),
  nextDueDate: z.coerce.date(),
});
export const planUpdateSchema = planBodySchema.partial();

export const planQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
  machineId: z.coerce.number().int().positive().optional(),
});
export const planDueQuerySchema = z.object({ days: z.coerce.number().int().min(0).max(365).default(7) });

export type PlanBody = z.infer<typeof planBodySchema>;
export type PlanUpdate = z.infer<typeof planUpdateSchema>;
export type PlanQuery = z.infer<typeof planQuerySchema>;
