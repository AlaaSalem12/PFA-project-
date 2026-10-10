import { Router } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/async-handler";
import { auditRequest } from "../../common/audit";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  idSchema, planBodySchema, planQuerySchema, planUpdateSchema, workOrderBodySchema, workOrderQuerySchema,
  workOrderStatusBodySchema, workOrderUpdateSchema,
  type PlanQuery, type WorkOrderQuery,
} from "./maintenance.schemas";
import { MaintenanceService } from "./maintenance.service";

const service = new MaintenanceService();
const maintainers = authorize(Role.ADMIN, Role.MAINTENANCE_TECH);
const reporters = authorize(Role.ADMIN, Role.MAINTENANCE_TECH, Role.PRODUCTION_MANAGER);
const idParam = (req: { params: Record<string, unknown> }) => Number(req.params.id);

/** Mounted at /api/v1/maintenance/plans */
export const maintenancePlanRouter = Router();
maintenancePlanRouter.use(authenticate, requirePasswordChange);
maintenancePlanRouter.get("/", validate({ query: planQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.listPlans(req.query as unknown as PlanQuery));
}));
maintenancePlanRouter.get("/:id", validate({ params: idSchema }), asyncHandler(async (req, res) => {
  res.json(await service.getPlan(idParam(req)));
}));
maintenancePlanRouter.post("/", maintainers, validate({ body: planBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const plan = await service.createPlan(req.body, req.user!.username);
  await auditRequest(req, "CREATE", "MaintenancePlan", plan.id, { machineId: plan.machineId });
  res.status(201).json(plan);
}));
maintenancePlanRouter.put("/:id", maintainers, validate({ params: idSchema, body: planUpdateSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const plan = await service.updatePlan(idParam(req), req.body);
  await auditRequest(req, "UPDATE", "MaintenancePlan", plan.id, { fields: Object.keys(req.body) });
  res.json(plan);
}));
maintenancePlanRouter.delete("/:id", maintainers, validate({ params: idSchema }), asyncHandler(async (req: AuthRequest, res) => {
  await service.deletePlan(idParam(req));
  await auditRequest(req, "DELETE", "MaintenancePlan", idParam(req));
  res.status(204).send();
}));
maintenancePlanRouter.post("/:id/generate-work-order", maintainers, validate({ params: idSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const result = await service.generateWorkOrder(idParam(req), req.user!.username);
  await auditRequest(req, "GENERATE_WORK_ORDER", "MaintenancePlan", idParam(req), { workOrderId: result.workOrder.id });
  res.status(201).json(result);
}));

/** Mounted at /api/v1/work-orders */
export const workOrderRouter = Router();
workOrderRouter.use(authenticate, requirePasswordChange);
workOrderRouter.get("/", validate({ query: workOrderQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.listWorkOrders(req.query as unknown as WorkOrderQuery));
}));
workOrderRouter.get("/:id", validate({ params: idSchema }), asyncHandler(async (req, res) => {
  res.json(await service.getWorkOrder(idParam(req)));
}));
workOrderRouter.post("/", reporters, validate({ body: workOrderBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const order = await service.createWorkOrder(req.body, req.user!.username);
  await auditRequest(req, "CREATE", "WorkOrder", order.id, { machineId: order.machineId, type: order.type });
  res.status(201).json(order);
}));
workOrderRouter.put("/:id", maintainers, validate({ params: idSchema, body: workOrderUpdateSchema }), asyncHandler(async (req: AuthRequest, res) => {
  const order = await service.updateWorkOrder(idParam(req), req.body);
  await auditRequest(req, "UPDATE", "WorkOrder", order.id, { fields: Object.keys(req.body) });
  res.json(order);
}));
workOrderRouter.patch("/:id/status", maintainers, validate({ params: idSchema, body: workOrderStatusBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const { status, ...extra } = req.body;
  const order = await service.changeWorkOrderStatus(idParam(req), status, extra);
  await auditRequest(req, "STATUS_CHANGE", "WorkOrder", order.id, { status });
  res.json(order);
}));
workOrderRouter.delete("/:id", authorize(Role.ADMIN), validate({ params: idSchema }), asyncHandler(async (req: AuthRequest, res) => {
  await service.deleteWorkOrder(idParam(req));
  await auditRequest(req, "DELETE", "WorkOrder", idParam(req));
  res.status(204).send();
}));
