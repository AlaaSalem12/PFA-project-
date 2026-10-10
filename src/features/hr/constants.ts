import type { EmployeeStatus } from '../../types/api';

export const EMPLOYEE_STATUSES: EmployeeStatus[] = [
  'ACTIVE',
  'ON_LEAVE',
  'SUSPENDED',
  'TERMINATED',
];

export const EMPLOYEE_STATUS_COLORS: Record<
  EmployeeStatus,
  'success' | 'warning' | 'error' | 'default'
> = {
  ACTIVE: 'success',
  ON_LEAVE: 'warning',
  SUSPENDED: 'error',
  TERMINATED: 'default',
};
