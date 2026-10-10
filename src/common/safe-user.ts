import { Role } from "@prisma/client";

export type SafeUser = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  enabled: boolean;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  employeeId?: number | null;
};

export const toSafeUser = (user: SafeUser): SafeUser => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  enabled: user.enabled,
  lastLoginAt: user.lastLoginAt,
  mustChangePassword: user.mustChangePassword,
  ...(user.employeeId === undefined ? {} : { employeeId: user.employeeId }),
});
