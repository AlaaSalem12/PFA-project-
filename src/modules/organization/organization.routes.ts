import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../common/async-handler";
import { auditRequest } from "../../common/audit";
import { AuthRequest, authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";

const body = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(500).optional() });
const id = z.object({ id: z.coerce.number().int().positive() });
const router = Router();
// Scoped to these paths: this router is mounted at /api/v1, so an unscoped guard would also block machines, notifications, etc.
router.use(["/departments", "/positions"], authenticate, requirePasswordChange, authorize(Role.ADMIN, Role.HR_MANAGER));

// Departments and positions share the same shape, so one registration covers both.
const registerCatalog = (path: "departments" | "positions", entity: "Department" | "Position") => {
  const model = path === "departments" ? prisma.department : prisma.position;
  const delegate = model as unknown as {
    findMany: typeof prisma.department.findMany;
    create: typeof prisma.department.create;
    update: typeof prisma.department.update;
    delete: typeof prisma.department.delete;
  };
  router.get(`/${path}`, asyncHandler(async (_req, res) => res.json(await delegate.findMany({ orderBy: { name: "asc" } }))));
  router.post(`/${path}`, validate({ body }), asyncHandler(async (req: AuthRequest, res) => {
    const created = await delegate.create({ data: { ...req.body, createdBy: req.user!.username } });
    await auditRequest(req, "CREATE", entity, created.id, { name: created.name });
    res.status(201).json(created);
  }));
  router.put(`/${path}/:id`, validate({ params: id, body }), asyncHandler(async (req: AuthRequest, res) => {
    const updated = await delegate.update({ where: { id: Number(req.params.id) }, data: req.body });
    await auditRequest(req, "UPDATE", entity, updated.id, { name: updated.name });
    res.json(updated);
  }));
  router.delete(`/${path}/:id`, validate({ params: id }), asyncHandler(async (req: AuthRequest, res) => {
    await delegate.delete({ where: { id: Number(req.params.id) } });
    await auditRequest(req, "DELETE", entity, req.params.id as string);
    res.status(204).send();
  }));
};
registerCatalog("departments", "Department");
registerCatalog("positions", "Position");

export const organizationRouter = router;
