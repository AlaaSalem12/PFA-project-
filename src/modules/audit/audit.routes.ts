import { Router } from "express";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../common/async-handler";
import { pageResponse } from "../../common/pagination";
import { authenticate, authorize, requirePasswordChange } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";

const querySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
  entity: z.string().optional(),
  action: z.string().optional(),
  userId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export const auditRouter = Router();
auditRouter.use(authenticate, requirePasswordChange, authorize(Role.ADMIN));
auditRouter.get("/", validate({ query: querySchema }), asyncHandler(async (req, res) => {
  const query = req.query as unknown as z.infer<typeof querySchema>;
  const where: Prisma.AuditLogWhereInput = {
    ...(query.entity ? { entity: query.entity } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}),
  };
  const [content, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, skip: query.page * query.size, take: query.size, orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, username: true, fullName: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  res.json(pageResponse(content, total, query.page, query.size));
}));
