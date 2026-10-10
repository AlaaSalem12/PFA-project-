import { z } from "zod";
import { blankToUndefined, optionalDate, optionalNumber, optionalText } from "../../common/zod";

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
  brand: optionalText(100),
  model: optionalText(100),
  serialNumber: optionalText(100),
  purchaseDate: optionalDate,
  workshop: optionalText(100),
  location: optionalText(100),
  hourlyCost: optionalNumber,
  operatingHours: optionalNumber,
  maintenanceIntervalDays: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(3650).optional()),
  nextMaintenanceDueAt: optionalDate,
  notes: optionalText(5000),
});
export const operatorsBodySchema = z.object({
  employeeIds: z.array(z.number().int().positive()).max(200),
});
export const statusBodySchema = z.object({
  status: machineStatusSchema,
  comment: z.string().trim().max(1000).optional(),
});
export const noteBodySchema = z.object({ note: z.string().trim().min(1).max(5000) });
