import { Router } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/async-handler";
import { auditFrom } from "../../common/audit";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  employeeBodySchema, employeeIdSchema, employeeOptionsQuerySchema, employeeQuerySchema, employeeUpdateSchema,
  type EmployeeQuery,
} from "./employee.schemas";
import { EmployeeService } from "./employee.service";

const service = new EmployeeService();
const router = Router();
router.use(authenticate, requirePasswordChange);

// Registered before the HR-only guard and before /:id; used by work-order and user pickers.
router.get("/options", authorize(Role.ADMIN, Role.HR_MANAGER, Role.PRODUCTION_MANAGER, Role.MAINTENANCE_TECH),
  validate({ query: employeeOptionsQuerySchema }), asyncHandler(async (req, res) => {
    res.json(await service.options((req.query as unknown as { search: string }).search));
  }));

router.use(authorize(Role.ADMIN, Role.HR_MANAGER));
router.get("/", validate({ query: employeeQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.list(req.query as unknown as EmployeeQuery));
}));
router.post("/", validate({ body: employeeBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const employee = await service.create(req.body, req.user!.username);
  await auditFrom(req, { action: "EMPLOYEE_CREATED", entity: "Employee", entityId: employee.id, metadata: { matricule: employee.matricule } });
  res.status(201).json(employee);
}));
router.get("/:id", validate({ params: employeeIdSchema }), asyncHandler(async (req, res) => {
  res.json(await service.get(Number(req.params.id)));
}));
router.put("/:id", validate({ params: employeeIdSchema, body: employeeUpdateSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const employee = await service.update(Number(req.params.id), req.body);
  // Field names only: values such as the social security number never go to the audit log.
  const fields = Object.keys(req.body).filter((key) => req.body[key] !== undefined);
  await auditFrom(req, { action: "EMPLOYEE_UPDATED", entity: "Employee", entityId: employee.id, metadata: { fields } });
  res.json(employee);
}));
router.delete("/:id", validate({ params: employeeIdSchema }), asyncHandler(async (req: AuthRequest, res) => {
  await service.remove(Number(req.params.id));
  await auditFrom(req, { action: "EMPLOYEE_DELETED", entity: "Employee", entityId: Number(req.params.id) });
  res.status(204).send();
}));

export const employeeRouter = router;
