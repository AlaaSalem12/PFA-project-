import { Router } from "express";
import multer from "multer";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/async-handler";
import { ApiError } from "../../common/api-error";
import { auditFrom } from "../../common/audit";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  machineBodySchema, machineIdSchema, machineQuerySchema, noteBodySchema, operatorsBodySchema, statusBodySchema,
} from "./machine.schemas";
import { MachineService } from "./machine.service";

const service = new MachineService();
// Buffered in memory (max 5 MB), then validated by magic bytes and written to disk by the service.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const machineRouter = Router();
machineRouter.use(authenticate, requirePasswordChange);
machineRouter.get("/", validate({ query: machineQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await service.list(req.query as never));
}));
machineRouter.get("/:id", validate({ params: machineIdSchema }), asyncHandler(async (req, res) => {
  res.json(await service.get(Number(req.params.id)));
}));
machineRouter.get("/:id/status-history", validate({ params: machineIdSchema }), asyncHandler(async (req, res) => {
  res.json(await service.history(Number(req.params.id)));
}));
machineRouter.get("/:id/maintenance-notes", validate({ params: machineIdSchema }), asyncHandler(async (req, res) => {
  res.json(await service.notes(Number(req.params.id)));
}));
machineRouter.post("/:id/maintenance-notes", authorize(Role.ADMIN, Role.MAINTENANCE_TECH, Role.PRODUCTION_MANAGER), validate({ params: machineIdSchema, body: noteBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const note = await service.addNote(Number(req.params.id), req.body.note, req.user!.id);
  await auditFrom(req, { action: "MACHINE_NOTE_ADDED", entity: "Machine", entityId: req.params.id as string, metadata: { noteId: note.id } });
  res.status(201).json(note);
}));
machineRouter.patch("/:id/status", authorize(Role.ADMIN, Role.MAINTENANCE_TECH, Role.PRODUCTION_MANAGER), validate({ params: machineIdSchema, body: statusBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const before = (await service.get(Number(req.params.id))).maintenanceStatus;
  const machine = await service.changeStatus(Number(req.params.id), req.body.status, req.body.comment, req.user!.id, req.user!.role);
  await auditFrom(req, { action: "MACHINE_STATUS_CHANGED", entity: "Machine", entityId: machine.id, metadata: { from: before, to: req.body.status, comment: req.body.comment ?? null } });
  res.json(machine);
}));
machineRouter.post("/", authorize(Role.ADMIN), validate({ body: machineBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const machine = await service.create(req.body, req.user!.id);
  await auditFrom(req, { action: "MACHINE_CREATED", entity: "Machine", entityId: machine.id, metadata: { code: machine.code } });
  res.status(201).json(machine);
}));
machineRouter.put("/:id", authorize(Role.ADMIN), validate({ params: machineIdSchema, body: machineBodySchema.partial() }), asyncHandler(async (req: AuthRequest, res) => {
  const machine = await service.update(Number(req.params.id), req.body);
  await auditFrom(req, { action: "MACHINE_UPDATED", entity: "Machine", entityId: machine.id, metadata: { fields: Object.keys(req.body) } });
  res.json(machine);
}));
machineRouter.delete("/:id", authorize(Role.ADMIN), validate({ params: machineIdSchema }), asyncHandler(async (req: AuthRequest, res) => {
  await service.remove(Number(req.params.id));
  await auditFrom(req, { action: "MACHINE_DELETED", entity: "Machine", entityId: req.params.id as string });
  res.status(204).send();
}));
machineRouter.post("/:id/image", authorize(Role.ADMIN), validate({ params: machineIdSchema }), upload.single("image"), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) throw new ApiError(400, "A JPEG, PNG, or WEBP image is required", [], "VALIDATION_ERROR");
  const machine = await service.setImage(Number(req.params.id), req.file.buffer);
  await auditFrom(req, { action: "MACHINE_IMAGE_UPDATED", entity: "Machine", entityId: machine.id });
  res.json(machine);
}));
machineRouter.put("/:id/operators", authorize(Role.ADMIN, Role.PRODUCTION_MANAGER), validate({ params: machineIdSchema, body: operatorsBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const machine = await service.setOperators(Number(req.params.id), req.body.employeeIds);
  await auditFrom(req, { action: "MACHINE_OPERATORS_UPDATED", entity: "Machine", entityId: machine.id, metadata: { employeeIds: req.body.employeeIds } });
  res.json(machine);
}));
machineRouter.get("/:id/work-orders", validate({ params: machineIdSchema }), asyncHandler(async (req, res) => {
  res.json(await service.workOrders(Number(req.params.id)));
}));
export const maintenanceOverdueHandler = asyncHandler(async (_req, res) => res.json(await service.overdue()));
