export type UserRole = 'ADMIN' | 'HR_MANAGER' | 'PRODUCTION_MANAGER' | 'MAINTENANCE_TECH' | 'EMPLOYEE';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string;
  mustChangePassword?: boolean;
  enabled?: boolean;
  lastLoginAt?: string | null;
}

export interface ApiErrorResponse {
  status?: number;
  message?: string;
  code?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ManagedUser extends User {
  enabled: boolean;
  lastLoginAt: string | null;
  lockedUntil?: string | null;
  createdAt?: string;
  mustChangePassword?: boolean;
}

export type MachineStatus = 'OPERATIONAL' | 'SCHEDULED_MAINTENANCE' | 'UNDER_MAINTENANCE' | 'BREAKDOWN' | 'OUT_OF_SERVICE';
export type MachineType = 'CNC' | 'LATHE' | 'MILLING' | 'PRESS' | 'WELDING_STATION' | 'FURNACE' | 'CRANE' | 'CUTTING' | 'OTHER';
export interface Machine {
  id: number; code: string; name: string; type: MachineType; brand?: string | null; model?: string | null;
  serialNumber?: string | null; purchaseDate?: string | null; workshop?: string | null; location?: string | null;
  hourlyCost?: number | null; operatingHours?: number | null; imageUrl?: string | null;
  maintenanceStatus: MachineStatus; lastMaintenanceAt?: string | null; nextMaintenanceDueAt?: string | null; notes?: string | null;
}
export interface DashboardData {
  users: { total: number; active: number; disabled: number; locked: number; neverLoggedIn: number; byRole: Array<{ role: UserRole; _count: { _all: number } }>; newUsersPerMonth: Array<{ month: string; count: number }>; recentLogins: Array<{ id: number; username: string; fullName: string; lastLoginAt: string }>; recentlyCreated: Array<{ id: number; username: string; fullName: string; createdAt: string }> };
  machines: { total: number; byStatus: Array<{ maintenanceStatus: MachineStatus; _count: { _all: number } }>; byType: Array<{ type: MachineType; _count: { _all: number } }>; overdueMaintenance: number; machinesInBreakdown: Machine[]; recentStatusChanges: Array<{ id: number; fromStatus: MachineStatus; toStatus: MachineStatus; changedAt: string; machine: Pick<Machine, 'id' | 'code' | 'name'>; changedBy: { fullName: string } }> };
}
export interface Notification { id: number; title: string; message: string; createdAt: string; readAt: string | null; machineId?: number | null; }
