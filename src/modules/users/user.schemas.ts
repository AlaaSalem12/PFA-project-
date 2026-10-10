import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "HR_MANAGER", "PRODUCTION_MANAGER", "MAINTENANCE_TECH", "EMPLOYEE"]);

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().regex(/^[A-Za-z]+,(asc|desc)$/).default("id,desc"),
  search: z.string().trim().default(""),
  role: userRoleSchema.optional(),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

export const createUserSchema = z.object({
  username: z.string().trim().min(3).max(80).regex(/^[a-z0-9._-]+$/),
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(255),
  role: userRoleSchema,
  employeeId: z.number().int().positive().optional(),
});
export const userIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
  email: z.string().trim().email().max(255).optional(),
  role: userRoleSchema.optional(),
  employeeId: z.number().int().positive().nullable().optional(),
});
export const enabledSchema = z.object({ enabled: z.boolean() });
