import { Router } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/async-handler";
import { auditFrom } from "../../common/audit";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  planBodySchema, planDueQuerySchema, planIdSchema, planQuerySchema, planUpdateSchema, type PlanQuery,
} from "./maintenance-plan.schemas";
import { MaintenancePlanService } from "./maintenance-plan.service";

const service = new MaintenancePlanService();
const managers = authorize(Role.ADMIN, Role.PRODUCTION_MANAGER);

export const maintenancePlanRouter = Router();
// Every role except EMPLOYEE may read plans.
maintenancePlanRouter.use(authenticate, requirePasswordChange);
const readers = authorize(Role.ADMIN, Role.HR_MANAGER, Role.PRODUCTION_MANAGER, Role.MAINTENANCE_TECH);

maintenancePlanRouter.get("/", readers, validate({ query: planQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.list(req.query as unknown as PlanQuery));
}));
// Registered before "/:id" so "due" is not parsed as an id.
maintenancePlanRouter.get("/due", readers, validate({ query: planDueQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.due((req.query as unknown as { days: number }).days));
}));
maintenancePlanRouter.get("/:id", readers, validate({ params: planIdSchema }), asyncHandler(async (req, res) => {
  res.json(await service.get(Number(req.params.id)));
}));
maintenancePlanRouter.post("/", managers, validate({ body: planBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const plan = await service.create(req.body, req.user!.id);
  await auditFrom(req, { action: "MAINTENANCE_PLAN_CREATED", entity: "MaintenancePlan", entityId: plan.id, metadata: { machineId: plan.machine.id } });
  res.status(201).json(plan);
}));
maintenancePlanRouter.put("/:id", managers, validate({ params: planIdSchema, body: planUpdateSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const plan = await service.update(Number(req.params.id), req.body);
  await auditFrom(req, { action: "MAINTENANCE_PLAN_UPDATED", entity: "MaintenancePlan", entityId: plan.id, metadata: { fields: Object.keys(req.body) } });
  res.json(plan);
}));
maintenancePlanRouter.delete("/:id", managers, validate({ params: planIdSchema }), asyncHandler(async (req: AuthRequest, res) => {
  await service.remove(Number(req.params.id));
  await auditFrom(req, { action: "MAINTENANCE_PLAN_DELETED", entity: "MaintenancePlan", entityId: Number(req.params.id) });
  res.status(204).send();
}));
maintenancePlanRouter.post("/:id/generate", managers, validate({ params: planIdSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const order = await service.generate(Number(req.params.id), req.user!.id);
  await auditFrom(req, {
    action: "WORK_ORDER_CREATED", entity: "WorkOrder", entityId: order.id,
    metadata: { machineId: order.machine.id, type: order.type, planId: Number(req.params.id) },
  });
  res.status(201).json(order);
}));
