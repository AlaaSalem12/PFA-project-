import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../common/api-error";
import { pageResponse } from "../../common/pagination";
import { toSafeUser } from "../../common/safe-user";
import { mailService } from "../mail/mail.service";

type CreateUserInput = {
  username: string;
  fullName: string;
  email: string;
  role: Role;
  employeeId?: number;
};

const generateTemporaryPassword = (): string => {
  const random = randomBytes(12).toString("base64url");
  return `${random}Aa1!`;
};

const safe = (user: Prisma.UserGetPayload<object>) => toSafeUser(user);

const assertEmployeeAvailable = async (employeeId: number, exceptUserId?: number): Promise<void> => {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null } });
  if (!employee) throw new ApiError(404, "Employee not found");
  const linked = await prisma.user.findFirst({
    where: { employeeId, deletedAt: null, ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}) },
  });
  if (linked) throw new ApiError(409, "Employee is already linked to another user");
};

export class UserService {
  async list(page: number, size: number, search: string, sort: string, role?: Role, enabled?: boolean) {
    const [sortField, direction] = sort.split(",");
    const allowedSort = ["id", "username", "fullName", "email", "role", "lastLoginAt"];
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [allowedSort.includes(sortField) ? sortField : "id"]: direction as Prisma.SortOrder,
    };
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(enabled === undefined ? {} : { enabled }),
      ...(search ? {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    };
    const [users, totalElements] = await prisma.$transaction([
      prisma.user.findMany({ where, orderBy, skip: page * size, take: size }),
      prisma.user.count({ where }),
    ]);
    return pageResponse(users.map(safe), totalElements, page, size);
  }

  async get(id: number) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new ApiError(404, "User not found");
    return safe(user);
  }

  async create(input: CreateUserInput, createdBy: number) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: input.username.trim().toLowerCase() }, { email: input.email.toLowerCase() }] },
    });
    if (existing) throw new ApiError(409, "Username or email already exists");
    if (input.employeeId) await assertEmployeeAvailable(input.employeeId);
    const password = generateTemporaryPassword();
    let user: Prisma.UserGetPayload<object>;
    try {
      user = await prisma.user.create({
        data: {
          username: input.username.trim().toLowerCase(),
          fullName: input.fullName,
          email: input.email.toLowerCase(),
          role: input.role,
          ...(input.employeeId ? { employee: { connect: { id: input.employeeId } } } : {}),
          passwordHash: await bcrypt.hash(password, 12),
          mustChangePassword: true,
          createdBy: { connect: { id: createdBy } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "Username or email already exists");
      }
      throw error;
    }
    let emailSent = false;
    try {
      emailSent = await mailService.sendWelcome({
        to: user.email, fullName: user.fullName, username: user.username, temporaryPassword: password,
      });
    } catch {
      emailSent = false;
    }
    return { user: safe(user), emailSent };
  }

  async update(
    id: number,
    input: Partial<Pick<CreateUserInput, "fullName" | "email" | "role">> & { employeeId?: number | null },
    actorId: number,
  ) {
    const current = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new ApiError(404, "User not found");
    if (id === actorId && input.role && input.role !== Role.ADMIN) {
      throw new ApiError(409, "An admin cannot demote themselves");
    }
    if (input.role && input.role !== current.role) {
      if (current.role === Role.ADMIN) {
        const admins = await prisma.user.count({ where: { role: Role.ADMIN, enabled: true, deletedAt: null } });
        if (admins <= 1) throw new ApiError(409, "The last remaining admin cannot be demoted");
      }
    }
    const { employeeId, ...fields } = input;
    const data: Prisma.UserUpdateInput = { ...fields };
    if (input.email) {
      const email = input.email.toLowerCase();
      const duplicate = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (duplicate) throw new ApiError(409, "Email already exists");
      data.email = email;
    }
    if (employeeId !== undefined) {
      if (employeeId === null) {
        data.employee = { disconnect: true };
      } else {
        await assertEmployeeAvailable(employeeId, id);
        data.employee = { connect: { id: employeeId } };
      }
    }
    // A role change must invalidate tokens that still carry the old role.
    if (input.role && input.role !== current.role) data.refreshTokenVersion = { increment: 1 };
    const user = await prisma.user.update({ where: { id }, data });
    return safe(user);
  }

  async setEnabled(id: number, enabled: boolean, actorId: number) {
    if (id === actorId && !enabled) throw new ApiError(409, "An admin cannot disable themselves");
    const current = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new ApiError(404, "User not found");
    if (!enabled && current.role === Role.ADMIN) {
      const admins = await prisma.user.count({ where: { role: Role.ADMIN, enabled: true, deletedAt: null } });
      if (admins <= 1) throw new ApiError(409, "The last remaining admin cannot be disabled");
    }
    const user = await prisma.user.update({
      where: { id },
      data: { enabled, refreshTokenVersion: { increment: 1 } },
    });
    return safe(user);
  }

  async resetPassword(id: number) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new ApiError(404, "User not found");
    const password = generateTemporaryPassword();
    const updated = await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true, refreshTokenVersion: { increment: 1 } },
    });
    let emailSent = false;
    try {
      emailSent = await mailService.sendWelcome({
        to: updated.email, fullName: updated.fullName, username: updated.username, temporaryPassword: password,
      });
    } catch {
      emailSent = false;
    }
    return { user: safe(updated), emailSent };
  }

  async remove(id: number, actorId: number) {
    if (id === actorId) throw new ApiError(409, "An admin cannot delete themselves");
    const current = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new ApiError(404, "User not found");
    if (current.role === Role.ADMIN) {
      const admins = await prisma.user.count({ where: { role: Role.ADMIN, deletedAt: null } });
      if (admins <= 1) throw new ApiError(409, "The last remaining admin cannot be removed");
    }
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), enabled: false, refreshTokenVersion: { increment: 1 } } });
  }
}
