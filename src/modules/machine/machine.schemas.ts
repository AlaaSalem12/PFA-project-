import { z } from "zod";

export const machineStatusSchema = z.enum([
  "OPERATIONAL", "SCHEDULED_MAINTENANCE", "UNDER_MAINTENANCE", "BREAKDOWN", "OUT_OF_SERVICE",
]);
export const machineTypeSchema = z.enum([
  "CNC", "LATHE", "MILLING", "PRESS", "WELDING_STATION", "FURNACE", "CRANE", "CUTTING", "OTHER",
]);
export const machineIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const machineQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().regex(/^[A-Za-z]+,(asc|desc)$/).default("id,desc"),
  search: z.string().trim().default(""),
  status: machineStatusSchema.optional(),
  type: machineTypeSchema.optional(),
  location: z.string().trim().optional(),
});
export const machineBodySchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(150),
  type: machineTypeSchema,
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  workshop: z.string().optional(),
  location: z.string().optional(),
  hourlyCost: z.coerce.number().nonnegative().optional(),
  operatingHours: z.coerce.number().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  nextMaintenanceDueAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export const statusBodySchema = z.object({
  status: machineStatusSchema,
  comment: z.string().trim().max(1000).optional(),
});
export const noteBodySchema = z.object({ note: z.string().trim().min(1).max(5000) });
