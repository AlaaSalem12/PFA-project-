import { Prisma } from "@prisma/client";
import { Request } from "express";
import { prisma } from "../config/prisma";

export const audit = async (input: {
  userId?: number;
  action: string;
  entity: string;
  entityId?: number | string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
}): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId === undefined ? undefined : String(input.entityId),
      metadata: input.metadata,
      ip: input.ip,
    },
  });
};

/**
 * Records an audit entry for the authenticated caller of a request.
 * Auditing must never break the business operation, so failures are only logged.
 */
export const auditRequest = async (
  req: Request & { user?: { id: number } },
  action: string,
  entity: string,
  entityId?: number | string,
  metadata?: Prisma.InputJsonValue,
  actorId?: number,
): Promise<void> => {
  try {
    await audit({ userId: actorId ?? req.user?.id, action, entity, entityId, metadata, ip: req.ip });
  } catch (error) {
    console.error("[audit] failed to record entry", error);
  }
};
