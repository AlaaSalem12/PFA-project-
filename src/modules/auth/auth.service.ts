import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../common/api-error";
import { mailService } from "../mail/mail.service";

type TokenUser = {
  id: number;
  username: string;
  role: Role;
  employeeId: number | null;
  tokenVersion: number;
  mustChangePassword: boolean;
};

const publicUser = (user: TokenUser & {
  fullName?: string;
  email?: string;
  enabled?: boolean;
  lastLoginAt?: Date | null;
}) => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  enabled: user.enabled,
  mustChangePassword: user.mustChangePassword,
  lastLoginAt: user.lastLoginAt ?? null,
});

const tokens = (user: TokenUser) => ({
  token: jwt.sign(user, env.JWT_SECRET, { expiresIn: "15m" }),
  refreshToken: jwt.sign(
    { id: user.id, tokenVersion: user.tokenVersion },
    env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  ),
});

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export class AuthService {
  async login(username: string, password: string) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.deletedAt || !user.enabled) throw new ApiError(401, "Invalid credentials");
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ApiError(423, "Account temporarily locked");

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts >= 5 ? 0 : attempts,
          lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
      throw new ApiError(401, "Invalid credentials");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
    const userData: TokenUser = {
      id: updated.id, username: updated.username, role: updated.role,
      employeeId: updated.employeeId, tokenVersion: updated.refreshTokenVersion,
      mustChangePassword: updated.mustChangePassword,
    };
    return { ...tokens(userData), user: publicUser({ ...userData, ...updated }) };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: number; tokenVersion: number };
      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      if (!user || user.deletedAt || !user.enabled || user.refreshTokenVersion !== payload.tokenVersion) {
        throw new ApiError(401, "Invalid or inactive account");
      }
      const userData: TokenUser = {
        id: user.id, username: user.username, role: user.role, employeeId: user.employeeId,
        tokenVersion: user.refreshTokenVersion, mustChangePassword: user.mustChangePassword,
      };
      return { ...tokens(userData), user: publicUser({ ...userData, ...user }) };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, "Invalid or expired refresh token");
    }
  }

  async me(id: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new ApiError(404, "User not found");
    return publicUser({
      ...user,
      tokenVersion: user.refreshTokenVersion,
      mustChangePassword: user.mustChangePassword,
    });
  }

  async changePassword(id: number, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new ApiError(400, "Current password is incorrect");
    }
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        mustChangePassword: false,
        refreshTokenVersion: { increment: 1 },
      },
    });
  }

  async logout(id: number): Promise<void> {
    await prisma.user.update({ where: { id }, data: { refreshTokenVersion: { increment: 1 } } });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt || !user.enabled) return;
    const rawToken = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await mailService.sendPasswordReset({ to: user.email, fullName: user.fullName, token: rawToken });
  }

  async resetPassword(token: string, newPassword: string): Promise<number> {
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) throw new ApiError(400, "Invalid or expired reset token");
    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false, refreshTokenVersion: { increment: 1 } },
      }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    return reset.userId;
  }
}
