import { Router } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/async-handler";
import { auditFrom } from "../../common/audit";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  createWorkOrderSchema, updateWorkOrderSchema, workOrderIdSchema, workOrderQuerySchema, workOrderStatusBodySchema,
  type WorkOrderQuery,
} from "./work-order.schemas";
import { Actor, WorkOrderService } from "./work-order.service";

const service = new WorkOrderService();
const actorOf = (req: AuthRequest): Actor => ({ id: req.user!.id, role: req.user!.role, employeeId: req.user!.employeeId });

export const workOrderRouter = Router();
workOrderRouter.use(authenticate, requirePasswordChange);

workOrderRouter.get("/", validate({ query: workOrderQuerySchema }), asyncHandler(async (req: AuthRequest, res) => {
  res.json(await service.list(req.query as unknown as WorkOrderQuery, actorOf(req)));
}));
workOrderRouter.post("/", authorize(Role.ADMIN, Role.PRODUCTION_MANAGER, Role.MAINTENANCE_TECH),
  validate({ body: createWorkOrderSchema }), asyncHandler(async (req: AuthRequest, res) => {
    const order = await service.create(req.body, req.user!.id);
    await auditFrom(req, {
      action: "WORK_ORDER_CREATED", entity: "WorkOrder", entityId: order.id,
      metadata: { machineId: order.machine.id, type: order.type, priority: order.priority, assignedToId: order.assignedTo?.id ?? null },
    });
    res.status(201).json(order);
  }));
workOrderRouter.get("/:id", validate({ params: workOrderIdSchema }), asyncHandler(async (req: AuthRequest, res) => {
  res.json(await service.get(Number(req.params.id), actorOf(req)));
}));
workOrderRouter.put("/:id", authorize(Role.ADMIN, Role.PRODUCTION_MANAGER),
  validate({ params: workOrderIdSchema, body: updateWorkOrderSchema }), asyncHandler(async (req: AuthRequest, res) => {
    const order = await service.update(Number(req.params.id), req.body);
    const fields = Object.keys(req.body).filter((key) => req.body[key] !== undefined);
    await auditFrom(req, { action: "WORK_ORDER_UPDATED", entity: "WorkOrder", entityId: order.id, metadata: { fields } });
    res.json(order);
  }));
workOrderRouter.patch("/:id/status", authorize(Role.ADMIN, Role.PRODUCTION_MANAGER, Role.MAINTENANCE_TECH),
  validate({ params: workOrderIdSchema, body: workOrderStatusBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
    const { order, from } = await service.changeStatus(Number(req.params.id), req.body);
    await auditFrom(req, { action: "WORK_ORDER_STATUS_CHANGED", entity: "WorkOrder", entityId: order.id, metadata: { from, to: order.status } });
    res.json(order);
  }));
