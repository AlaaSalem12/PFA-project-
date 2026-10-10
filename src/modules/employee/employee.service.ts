import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../common/api-error";
import { pageResponse } from "../../common/pagination";
import type { EmployeeBody, EmployeeQuery } from "./employee.schemas";

const employeeInclude = {
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
  user: { select: { id: true, username: true, role: true, deletedAt: true } },
} satisfies Prisma.EmployeeInclude;

const detailInclude = {
  ...employeeInclude,
  authorizedMachines: { where: { deletedAt: null }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } },
} satisfies Prisma.EmployeeInclude;

type EmployeeRow = Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>;
type EmployeeDetailRow = Prisma.EmployeeGetPayload<{ include: typeof detailInclude }>;

const SORTABLE = ["id", "matricule", "firstName", "lastName", "email", "hireDate", "status"];

/** Contract shape: no audit columns, soft-deleted users hidden. */
export const toEmployeeDto = (employee: EmployeeRow) => ({
  id: employee.id,
  matricule: employee.matricule,
  firstName: employee.firstName,
  lastName: employee.lastName,
  socialSecurityNumber: employee.socialSecurityNumber,
  birthDate: employee.birthDate,
  phone: employee.phone,
  email: employee.email,
  address: employee.address,
  hireDate: employee.hireDate,
  photoUrl: employee.photoUrl,
  status: employee.status,
  departmentId: employee.departmentId,
  positionId: employee.positionId,
  department: employee.department,
  position: employee.position,
  user: employee.user && !employee.user.deletedAt
    ? { id: employee.user.id, username: employee.user.username, role: employee.user.role }
    : null,
});

const validationError = (field: string, message: string) =>
  new ApiError(400, message, [{ field, message }], "VALIDATION_ERROR");

export class EmployeeService {
  async list(query: EmployeeQuery) {
    const [field, direction] = query.sort.split(",");
    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {
      [SORTABLE.includes(field) ? field : "id"]: direction as Prisma.SortOrder,
    };
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.positionId ? { positionId: query.positionId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
          { matricule: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      } : {}),
    };
    const [content, total] = await prisma.$transaction([
      prisma.employee.findMany({ where, include: employeeInclude, orderBy, skip: query.page * query.size, take: query.size }),
      prisma.employee.count({ where }),
    ]);
    return pageResponse(content.map(toEmployeeDto), total, query.page, query.size);
  }

  /** Lightweight picker for work orders and user linking: ACTIVE employees only, max 20. */
  async options(search: string) {
    const employees = await prisma.employee.findMany({
      where: {
        deletedAt: null, status: "ACTIVE",
        ...(search ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { matricule: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      select: { id: true, matricule: true, firstName: true, lastName: true, position: { select: { name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 20,
    });
    return employees.map((employee) => ({
      id: employee.id,
      matricule: employee.matricule,
      fullName: `${employee.firstName} ${employee.lastName}`,
      ...(employee.position ? { position: employee.position.name } : {}),
    }));
  }

  private async findActive(id: number) {
    const employee = await prisma.employee.findFirst({ where: { id, deletedAt: null }, include: detailInclude });
    if (!employee) throw new ApiError(404, "Employee not found", [], "NOT_FOUND");
    return employee as EmployeeDetailRow;
  }

  async get(id: number) {
    const employee = await this.findActive(id);
    return { ...toEmployeeDto(employee), authorizedMachines: employee.authorizedMachines };
  }

  private async assertReferences(input: { departmentId?: number | null; positionId?: number | null }) {
    if (input.departmentId && !(await prisma.department.findUnique({ where: { id: input.departmentId } }))) {
      throw validationError("departmentId", "Unknown department");
    }
    if (input.positionId && !(await prisma.position.findUnique({ where: { id: input.positionId } }))) {
      throw validationError("positionId", "Unknown position");
    }
  }

  private assertDates(birthDate?: Date | null, hireDate?: Date | null) {
    if (birthDate && hireDate && birthDate >= hireDate) {
      throw validationError("birthDate", "Birth date must be before the hire date");
    }
  }

  async create(input: EmployeeBody, actor: string) {
    this.assertDates(input.birthDate, input.hireDate);
    await this.assertReferences(input);
    const created = await prisma.employee.create({
      data: { ...input, createdBy: actor },
      include: employeeInclude,
    });
    return toEmployeeDto(created);
  }

  async update(id: number, input: Partial<EmployeeBody>) {
    const current = await this.findActive(id);
    this.assertDates(input.birthDate ?? current.birthDate, input.hireDate ?? current.hireDate);
    await this.assertReferences(input);
    const updated = await prisma.employee.update({ where: { id }, data: input, include: employeeInclude });
    return toEmployeeDto(updated);
  }

  async remove(id: number) {
    await this.findActive(id);
    const openOrders = await prisma.workOrder.count({
      where: { assignedToId: id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    });
    if (openOrders > 0) {
      throw new ApiError(409, `Employee has ${openOrders} open work order(s)`, [], "CONFLICT");
    }
    await prisma.$transaction([
      // Free the one-to-one link so the user account can be attached to someone else.
      prisma.user.updateMany({ where: { employeeId: id }, data: { employeeId: null } }),
      prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), status: "TERMINATED" } }),
    ]);
  }
}
