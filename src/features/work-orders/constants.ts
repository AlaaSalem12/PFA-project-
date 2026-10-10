import type { UserRole, WorkOrderPriority, WorkOrderStatus, WorkOrderType } from '../../types/api';

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = ['OPEN', 'IN_PROGRESS', 'DONE'];
export const WORK_ORDER_PRIORITIES: WorkOrderPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const WORK_ORDER_TYPES: WorkOrderType[] = ['PREVENTIVE', 'CORRECTIVE'];

/** Roles that may create work orders and change their status. */
export const WORK_ORDER_WRITE_ROLES: UserRole[] = [
  'ADMIN',
  'PRODUCTION_MANAGER',
  'MAINTENANCE_TECH',
];
/** Roles that may edit priority / assignee. */
export const WORK_ORDER_EDIT_ROLES: UserRole[] = ['ADMIN', 'PRODUCTION_MANAGER'];
export const PLAN_ROLES: UserRole[] = ['ADMIN', 'PRODUCTION_MANAGER'];

/** Allowed status transitions (contract section 5). DONE is final. */
export const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['OPEN', 'DONE'],
  DONE: [],
};

export const PRIORITY_COLORS: Record<WorkOrderPriority, 'default' | 'info' | 'warning' | 'error'> =
  {
    LOW: 'default',
    MEDIUM: 'info',
    HIGH: 'warning',
    CRITICAL: 'error',
  };

export const WORK_ORDER_STATUS_COLORS: Record<WorkOrderStatus, 'default' | 'primary' | 'success'> =
  {
    OPEN: 'default',
    IN_PROGRESS: 'primary',
    DONE: 'success',
  };
