import { Prisma } from "@prisma/client";
import { Request } from "express";
import { prisma } from "../config/prisma";

export interface AuditInput {
  userId?: number;
  action: string;
  entity: string;
  entityId?: number | string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
}

/** Fire-and-forget safe: never throws, failures are only logged. Never put passwords, tokens or SSN in metadata. */
export const audit = async (input: AuditInput): Promise<void> => {
  try {
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
  } catch (error) {
    console.error("[audit] failed to record entry", error);
  }
};

/** Records an audit entry using the caller's userId (req.user) and ip (req.ip). */
export const auditFrom = (
  req: Request & { user?: { id: number } },
  input: { action: string; entity: string; entityId?: number | string; metadata?: Prisma.InputJsonValue; userId?: number },
): Promise<void> =>
  audit({ ...input, userId: input.userId ?? req.user?.id, ip: req.ip });

/** @deprecated positional form kept for the maintenance module; use auditFrom. */
export const auditRequest = (
  req: Request & { user?: { id: number } },
  action: string,
  entity: string,
  entityId?: number | string,
  metadata?: Prisma.InputJsonValue,
  actorId?: number,
): Promise<void> => auditFrom(req, { action, entity, entityId, metadata, userId: actorId });
