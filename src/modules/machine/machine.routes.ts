import { Router } from "express";
import multer from "multer";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../common/async-handler";
import { ApiError } from "../../common/api-error";
import { auditRequest } from "../../common/audit";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  machineBodySchema, machineIdSchema, machineQuerySchema, noteBodySchema, statusBodySchema,
} from "./machine.schemas";
import { MachineService } from "./machine.service";

const service = new MachineService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
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
  await auditRequest(req, "ADD_NOTE", "Machine", req.params.id as string, { noteId: note.id });
  res.status(201).json(note);
}));
machineRouter.patch("/:id/status", authorize(Role.ADMIN, Role.MAINTENANCE_TECH, Role.PRODUCTION_MANAGER), validate({ params: machineIdSchema, body: statusBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const machine = await service.changeStatus(Number(req.params.id), req.body.status, req.body.comment, req.user!.id, req.user!.role);
  await auditRequest(req, "STATUS_CHANGE", "Machine", machine.id, { status: req.body.status, comment: req.body.comment ?? null });
  res.json(machine);
}));
machineRouter.post("/", authorize(Role.ADMIN), validate({ body: machineBodySchema }), asyncHandler(async (req: AuthRequest, res) => {
  const machine = await service.create(req.body, req.user!.id);
  await auditRequest(req, "CREATE", "Machine", machine.id, { code: machine.code });
  res.status(201).json(machine);
}));
machineRouter.put("/:id", authorize(Role.ADMIN), validate({ params: machineIdSchema, body: machineBodySchema.partial() }), asyncHandler(async (req: AuthRequest, res) => {
  const machine = await service.update(Number(req.params.id), req.body);
  await auditRequest(req, "UPDATE", "Machine", machine.id, { fields: Object.keys(req.body) });
  res.json(machine);
}));
machineRouter.delete("/:id", authorize(Role.ADMIN), validate({ params: machineIdSchema }), asyncHandler(async (req: AuthRequest, res) => {
  await service.remove(Number(req.params.id));
  await auditRequest(req, "DELETE", "Machine", req.params.id as string);
  res.status(204).send();
}));
machineRouter.post("/:id/image", authorize(Role.ADMIN), validate({ params: machineIdSchema }), upload.single("image"), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) throw new ApiError(400, "A JPEG, PNG, or WEBP image is required", [], "VALIDATION_ERROR");
  const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const machine = await service.update(Number(req.params.id), { imageUrl });
  await auditRequest(req, "UPDATE_IMAGE", "Machine", machine.id);
  res.json(machine);
}));
export const maintenanceOverdueHandler = asyncHandler(async (_req, res) => res.json(await service.overdue()));
