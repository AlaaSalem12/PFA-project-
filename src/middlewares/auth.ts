import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env";
import { ApiError } from "../common/api-error";

export type AuthUser = { id: number; username: string; role: Role; employeeId: number | null; tokenVersion: number; mustChangePassword: boolean };
export type AuthRequest = Request & { user?: AuthUser };

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new ApiError(401, "Authentication required"));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    const { prisma } = await import("../config/prisma");
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.enabled || user.deletedAt || user.refreshTokenVersion !== payload.tokenVersion ||
      (user.lockedUntil && user.lockedUntil > new Date())) {
      next(new ApiError(401, "Invalid or inactive account"));
      return;
    }
    req.user = {
      id: user.id, username: user.username, role: user.role,
      employeeId: user.employeeId, tokenVersion: user.refreshTokenVersion,
      mustChangePassword: user.mustChangePassword,
    };
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired access token"));
  }
};

export const authorize = (...roles: Role[]) => (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.user || !roles.includes(req.user.role)) {
    next(new ApiError(403, "Insufficient permissions"));
    return;
  }
  next();
};

export const requirePasswordChange = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (req.user?.mustChangePassword) {
    next(new ApiError(403, "Password change required", [], "PASSWORD_CHANGE_REQUIRED"));
    return;
  }
  next();
};
