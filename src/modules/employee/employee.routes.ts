import { Router } from "express";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { pageResponse } from "../../common/pagination";
import { asyncHandler } from "../../common/async-handler";
import { ApiError } from "../../common/api-error";
import { auditRequest } from "../../common/audit";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";

const employeeBody = z.object({
  matricule: z.string().min(1).max(40), firstName: z.string().min(1), lastName: z.string().min(1),
  socialSecurityNumber: z.string().optional(), birthDate: z.coerce.date().optional(), phone: z.string().optional(),
  email: z.string().email().optional(), address: z.string().optional(), hireDate: z.coerce.date(),
  photoUrl: z.string().url().optional(), status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]).optional(),
  departmentId: z.number().int().positive().optional(), positionId: z.number().int().positive().optional(),
});
const params = z.object({ id: z.coerce.number().int().positive() });
const query = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().regex(/^[A-Za-z]+,(asc|desc)$/).default("id,desc"),
  search: z.string().default(""),
});
const router = Router();
router.use(authenticate, requirePasswordChange, authorize(Role.ADMIN, Role.HR_MANAGER));
router.get("/", validate({ query }), asyncHandler(async (req, res) => {
  const { page, size, search, sort } = req.query as unknown as z.infer<typeof query>;
  const [sortField, direction] = sort.split(",");
  const orderBy: Prisma.EmployeeOrderByWithRelationInput =
    sortField === "firstName" || sortField === "lastName" || sortField === "matricule" || sortField === "status"
      ? { [sortField]: direction as Prisma.SortOrder }
      : { id: direction as Prisma.SortOrder };
  const where = { deletedAt: null, ...(search ? { OR: [{ firstName: { contains: search, mode: "insensitive" as const } }, { lastName: { contains: search, mode: "insensitive" as const } }, { matricule: { contains: search, mode: "insensitive" as const } }] } : {}) };
  const [content, totalElements] = await prisma.$transaction([
    prisma.employee.findMany({ where, include: { department: true, position: true }, skip: page * size, take: size, orderBy }),
    prisma.employee.count({ where }),
  ]);
  res.json(pageResponse(content, totalElements, page, size));
}));
const findActive = async (id: number) => {
  const employee = await prisma.employee.findFirst({ where: { id, deletedAt: null }, include: { department: true, position: true } });
  if (!employee) throw new ApiError(404, "Employee not found");
  return employee;
};
router.post("/", validate({ body: employeeBody }), asyncHandler(async (req: AuthRequest, res) => {
  const employee = await prisma.employee.create({ data: { ...req.body, createdBy: req.user!.username } });
  await auditRequest(req, "CREATE", "Employee", employee.id, { matricule: employee.matricule });
  res.status(201).json(employee);
}));
router.get("/:id", validate({ params }), asyncHandler(async (req, res) => {
  res.json(await findActive(Number(req.params.id)));
}));
router.put("/:id", validate({ params, body: employeeBody.partial() }), asyncHandler(async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await findActive(id);
  const employee = await prisma.employee.update({ where: { id }, data: req.body });
  await auditRequest(req, "UPDATE", "Employee", id, { fields: Object.keys(req.body) });
  res.json(employee);
}));
router.delete("/:id", validate({ params }), asyncHandler(async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await findActive(id);
  const linkedUser = await prisma.user.findFirst({ where: { employeeId: id, deletedAt: null } });
  if (linkedUser) throw new ApiError(409, "Employee is linked to an active user account");
  await prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), status: "TERMINATED" } });
  await auditRequest(req, "DELETE", "Employee", id);
  res.status(204).send();
}));
export const employeeRouter = router;
