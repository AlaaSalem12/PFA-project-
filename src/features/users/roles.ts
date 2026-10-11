import type { UserRole } from '../../types/api';

/** Role values; display labels come from `formatEnum(role, 'UserRole')`. */
export const ROLES: UserRole[] = [
  'ADMIN',
  'HR_MANAGER',
  'PRODUCTION_MANAGER',
  'MAINTENANCE_TECH',
  'EMPLOYEE',
];
