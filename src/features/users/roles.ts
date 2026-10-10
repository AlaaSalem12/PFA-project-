import type { UserRole } from '../../types/api';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  HR_MANAGER: 'HR manager',
  PRODUCTION_MANAGER: 'Production manager',
  MAINTENANCE_TECH: 'Maintenance technician',
  EMPLOYEE: 'Employee',
};

export const ROLES = Object.keys(ROLE_LABELS) as UserRole[];
