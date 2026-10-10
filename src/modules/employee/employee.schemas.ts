import { EmployeeStatus } from "@prisma/client";
import { z } from "zod";
import { blankToUndefined, optionalDate, optionalText } from "../../common/zod";

const lowercaseEmail = z.preprocess((value) => {
  const trimmed = blankToUndefined(value);
  return typeof trimmed === "string" ? trimmed.toLowerCase() : trimmed;
}, z.string().email().max(255).optional());

export const employeeStatusSchema = z.enum(EmployeeStatus);

export const employeeBodySchema = z.object({
  matricule: z.string().trim().min(1).max(40),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  socialSecurityNumber: optionalText(40),
  birthDate: optionalDate,
  phone: z.preprocess(blankToUndefined, z.string().regex(/^[+0-9 ()-]{6,20}$/, "Invalid phone number").optional()),
  email: lowercaseEmail,
  address: optionalText(500),
  hireDate: z.coerce.date(),
  photoUrl: z.preprocess(blankToUndefined, z.string().url().max(500).optional()),
  status: employeeStatusSchema.optional(),
  // null clears the link on update
  departmentId: z.number().int().positive().nullable().optional(),
  positionId: z.number().int().positive().nullable().optional(),
});
export const employeeUpdateSchema = employeeBodySchema.partial();

export const employeeIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().regex(/^[A-Za-z]+,(asc|desc)$/).default("id,desc"),
  search: z.string().trim().default(""),
  departmentId: z.coerce.number().int().positive().optional(),
  positionId: z.coerce.number().int().positive().optional(),
  status: employeeStatusSchema.optional(),
});

export const employeeOptionsQuerySchema = z.object({ search: z.string().trim().default("") });

export type EmployeeBody = z.infer<typeof employeeBodySchema>;
export type EmployeeQuery = z.infer<typeof employeeQuerySchema>;
