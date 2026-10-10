import { Role } from "@prisma/client";

export type EmployeeRef = { id: number; matricule: string; firstName: string; lastName: string };

export type SafeUserSource = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  enabled: boolean;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  lockedUntil: Date | null;
  createdAt: Date;
  employee?: EmployeeRef | null;
};

export type SafeUser = Required<Omit<SafeUserSource, "employee">> & { employee: EmployeeRef | null };

/** The only shape in which users may leave the API (no hash, no token version, no counters). */
export const toSafeUser = (user: SafeUserSource): SafeUser => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  enabled: user.enabled,
  lastLoginAt: user.lastLoginAt,
  mustChangePassword: user.mustChangePassword,
  lockedUntil: user.lockedUntil,
  createdAt: user.createdAt,
  employee: user.employee
    ? { id: user.employee.id, matricule: user.employee.matricule, firstName: user.employee.firstName, lastName: user.employee.lastName }
    : null,
});
