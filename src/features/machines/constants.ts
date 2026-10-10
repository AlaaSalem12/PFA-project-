import type { MachineStatus, MachineType, UserRole } from '../../types/api';

export const MACHINE_STATUSES: MachineStatus[] = [
  'OPERATIONAL',
  'SCHEDULED_MAINTENANCE',
  'UNDER_MAINTENANCE',
  'BREAKDOWN',
  'OUT_OF_SERVICE',
];

export const MACHINE_TYPES: MachineType[] = [
  'CNC',
  'LATHE',
  'MILLING',
  'PRESS',
  'WELDING_STATION',
  'FURNACE',
  'CRANE',
  'CUTTING',
  'OTHER',
];

/** Allowed status transitions (contract section 4). */
export const STATUS_TRANSITIONS: Record<MachineStatus, MachineStatus[]> = {
  OPERATIONAL: ['SCHEDULED_MAINTENANCE', 'UNDER_MAINTENANCE', 'BREAKDOWN', 'OUT_OF_SERVICE'],
  SCHEDULED_MAINTENANCE: ['UNDER_MAINTENANCE', 'OPERATIONAL'],
  UNDER_MAINTENANCE: ['OPERATIONAL', 'BREAKDOWN'],
  BREAKDOWN: ['UNDER_MAINTENANCE', 'OPERATIONAL', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['UNDER_MAINTENANCE', 'OPERATIONAL'],
};

export const STATUS_CHANGE_ROLES: UserRole[] = ['ADMIN', 'PRODUCTION_MANAGER', 'MAINTENANCE_TECH'];
export const OPERATOR_EDIT_ROLES: UserRole[] = ['ADMIN', 'PRODUCTION_MANAGER'];

export const COMMENT_REQUIRED: MachineStatus[] = ['BREAKDOWN', 'OUT_OF_SERVICE'];

/** Transitions the given role may perform from the current status. */
export function allowedTransitions(
  from: MachineStatus,
  role: UserRole | undefined,
): MachineStatus[] {
  if (!role || !STATUS_CHANGE_ROLES.includes(role)) return [];
  if (from === 'OUT_OF_SERVICE' && role !== 'ADMIN') return [];
  return STATUS_TRANSITIONS[from];
}
