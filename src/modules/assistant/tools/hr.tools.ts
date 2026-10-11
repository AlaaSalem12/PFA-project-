import { EmployeeStatus, Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../../config/prisma";
import { defineTool } from "./define-tool";

const HR_ROLES = [Role.ADMIN, Role.HR_MANAGER];

// Explicit whitelist: SSN, address, birth date, phone and e-mail are never selected, so they cannot reach the LLM.
const safeEmployeeSelect = {
  matricule: true, firstName: true, lastName: true, status: true, hireDate: true,
  department: { select: { name: true } }, position: { select: { name: true } },
} satisfies Prisma.EmployeeSelect;

export const hrTools = [
  defineTool({
    name: "search_employees",
    description: "Search employees (HR data). Arguments (all optional): query = text matched against first name, last name or matricule (e.g. \"EMP-0012\"); "
      + "department = department name such as \"Welding\", \"Production\", \"Machining\", \"Maintenance\", \"Administration\"; "
      + `status = one of ${Object.values(EmployeeStatus).join(", ")} (ON_LEAVE means on leave / en congé). `
      + "Returns the total and up to 20 employees with matricule, full name, department, position, status and hire date.",
    roles: HR_ROLES,
    args: z.object({
      query: z.string().trim().max(100).optional(),
      department: z.string().trim().max(120).optional(),
      status: z.enum(EmployeeStatus).optional(),
    }),
    handler: async (_ctx, args) => {
      const where: Prisma.EmployeeWhereInput = {
        deletedAt: null,
        ...(args.status ? { status: args.status } : {}),
        ...(args.department ? { department: { name: { contains: args.department, mode: "insensitive" } } } : {}),
        ...(args.query ? {
          OR: [
            { firstName: { contains: args.query, mode: "insensitive" } },
            { lastName: { contains: args.query, mode: "insensitive" } },
            { matricule: { contains: args.query, mode: "insensitive" } },
          ],
        } : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.employee.count({ where }),
        prisma.employee.findMany({ where, select: safeEmployeeSelect, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 50 }),
      ]);
      return {
        total,
        employees: rows.map((employee) => ({
          matricule: employee.matricule,
          fullName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department?.name ?? null,
          position: employee.position?.name ?? null,
          status: employee.status,
          hireDate: employee.hireDate.toISOString().slice(0, 10),
        })),
      };
    },
  }),

  defineTool({
    name: "get_hr_summary",
    description: "Headcount summary: total employees, employees per department and per status (ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED). No arguments.",
    roles: HR_ROLES,
    args: z.object({}),
    handler: async () => {
      const [total, byDepartment, byStatus, departments] = await Promise.all([
        prisma.employee.count({ where: { deletedAt: null } }),
        prisma.employee.groupBy({ by: ["departmentId"], where: { deletedAt: null }, _count: { _all: true } }),
        prisma.employee.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
        prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      ]);
      const names = new Map(departments.map((department) => [department.id, department.name]));
      const statusCounts = new Map(byStatus.map((row) => [row.status, row._count._all]));
      return {
        total,
        byDepartment: byDepartment
          .map((row) => ({ department: row.departmentId === null ? "Unassigned" : names.get(row.departmentId) ?? "Unknown", count: row._count._all }))
          .sort((a, b) => b.count - a.count),
        byStatus: Object.fromEntries(Object.values(EmployeeStatus).map((status) => [status, statusCounts.get(status) ?? 0])),
      };
    },
  }),
];
