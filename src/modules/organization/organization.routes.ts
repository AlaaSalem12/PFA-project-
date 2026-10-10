import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../../common/async-handler";
import { auditFrom } from "../../common/audit";
import { optionalText } from "../../common/zod";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { CatalogKind, CatalogService } from "./organization.service";

const body = z.object({ name: z.string().trim().min(1).max(120), description: optionalText(500) });
const idParams = z.object({ id: z.coerce.number().int().positive() });

const catalogRouter = (kind: CatalogKind, entity: "Department" | "Position") => {
  const service = new CatalogService(kind);
  const prefix = entity.toUpperCase();
  const router = Router();
  router.use(authenticate, requirePasswordChange, authorize(Role.ADMIN, Role.HR_MANAGER));
  router.get("/", asyncHandler(async (_req, res) => res.json(await service.list())));
  router.post("/", validate({ body }), asyncHandler(async (req: AuthRequest, res) => {
    const created = await service.create(req.body, req.user!.username);
    await auditFrom(req, { action: `${prefix}_CREATED`, entity, entityId: created.id, metadata: { name: created.name } });
    res.status(201).json(created);
  }));
  router.put("/:id", validate({ params: idParams, body }), asyncHandler(async (req: AuthRequest, res) => {
    const updated = await service.update(Number(req.params.id), req.body);
    await auditFrom(req, { action: `${prefix}_UPDATED`, entity, entityId: updated.id, metadata: { name: updated.name } });
    res.json(updated);
  }));
  router.delete("/:id", validate({ params: idParams }), asyncHandler(async (req: AuthRequest, res) => {
    await service.remove(Number(req.params.id));
    await auditFrom(req, { action: `${prefix}_DELETED`, entity, entityId: Number(req.params.id) });
    res.status(204).send();
  }));
  return router;
};

export const departmentRouter = catalogRouter("department", "Department");
export const positionRouter = catalogRouter("position", "Position");
