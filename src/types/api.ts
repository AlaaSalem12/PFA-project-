export type UserRole =
  'ADMIN' | 'HR_MANAGER' | 'PRODUCTION_MANAGER' | 'MAINTENANCE_TECH' | 'EMPLOYEE';

/* ---------- Common shapes (contract §0) ---------- */

export interface FieldError {
  field: string;
  message: string;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'CORS_REJECTED'
  | 'INTERNAL';

export interface ApiErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  code?: ApiErrorCode | string;
  path?: string;
  fieldErrors?: FieldError[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type Page<T> = PageResponse<T>;

export type SortDirection = 'asc' | 'desc';

/** Standard paged query params: page is 0-based, size 1–100, sort = "field,asc|desc". */
export interface PagedQuery {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
}

/* ---------- Auth / users (contract §1, §2) ---------- */

export interface EmployeeRef {
  id: number;
  matricule: string;
  firstName: string;
  lastName: string;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string;
  mustChangePassword?: boolean;
  enabled?: boolean;
  lastLoginAt?: string | null;
  employee?: EmployeeRef | null;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface SafeUser extends User {
  email: string;
  enabled: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  createdAt: string;
  employee: EmployeeRef | null;
}

export interface ManagedUser extends User {
  enabled: boolean;
  lastLoginAt: string | null;
  lockedUntil?: string | null;
  createdAt?: string;
  mustChangePassword?: boolean;
}

export interface UserQuery extends PagedQuery {
  role?: UserRole;
  enabled?: boolean;
}

export interface UserCreateResponse {
  user: SafeUser;
  emailSent: boolean;
  temporaryPassword?: string;
}

/* ---------- HR (contract §3) ---------- */

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';

export interface NamedRef {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  matricule: string;
  firstName: string;
  lastName: string;
  socialSecurityNumber?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate: string;
  photoUrl?: string | null;
  status: EmployeeStatus;
  department: NamedRef | null;
  position: NamedRef | null;
  user?: { id: number; username: string; role: UserRole } | null;
}

export interface EmployeeDetail extends Employee {
  authorizedMachines: Array<{ id: number; code: string; name: string }>;
}

export interface EmployeeOption {
  id: number;
  matricule: string;
  fullName: string;
  position?: string;
}

export interface EmployeeQuery extends PagedQuery {
  departmentId?: number;
  positionId?: number;
  status?: EmployeeStatus;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  employeeCount: number;
}

export type Position = Department;

/* ---------- Machines (contract §4) ---------- */

export type MachineStatus =
  'OPERATIONAL' | 'SCHEDULED_MAINTENANCE' | 'UNDER_MAINTENANCE' | 'BREAKDOWN' | 'OUT_OF_SERVICE';
export type MachineType =
  | 'CNC'
  | 'LATHE'
  | 'MILLING'
  | 'PRESS'
  | 'WELDING_STATION'
  | 'FURNACE'
  | 'CRANE'
  | 'CUTTING'
  | 'OTHER';

export interface Machine {
  id: number;
  code: string;
  name: string;
  type: MachineType;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  workshop?: string | null;
  location?: string | null;
  hourlyCost?: number | null;
  operatingHours?: number | null;
  imageUrl?: string | null;
  maintenanceStatus: MachineStatus;
  maintenanceIntervalDays?: number | null;
  lastMaintenanceAt?: string | null;
  nextMaintenanceDueAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MachineOperator {
  id: number;
  matricule: string;
  firstName: string;
  lastName: string;
}

export interface MachineDetail extends Machine {
  authorizedOperators: MachineOperator[];
}

export interface MachineNote {
  id: number;
  note: string;
  createdAt: string;
  createdBy: { fullName: string } | null;
}

export interface MachineQuery extends PagedQuery {
  status?: MachineStatus;
  type?: MachineType;
  location?: string;
}

export interface MachineStatusChange {
  id: number;
  fromStatus: MachineStatus | null;
  toStatus: MachineStatus;
  comment: string | null;
  changedAt: string;
  changedBy: { id: number; username: string; fullName: string };
}

/* ---------- Work orders (contract §5) ---------- */

export type WorkOrderType = 'PREVENTIVE' | 'CORRECTIVE';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface WorkOrder {
  id: number;
  machine: { id: number; code: string; name: string };
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  description: string;
  assignedTo: { id: number; firstName: string; lastName: string } | null;
  openedAt: string;
  closedAt: string | null;
  cost: number | null;
  partsUsed: string | null;
  resolution: string | null;
  createdBy: { id: number; fullName: string } | null;
}

export interface WorkOrderQuery extends PagedQuery {
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  type?: WorkOrderType;
  machineId?: number;
  assignedToId?: number;
  mine?: boolean;
}

export interface MaintenancePlan {
  id: number;
  machine: { id: number; code: string; name: string };
  task: string;
  frequencyDays: number;
  nextDueDate: string;
}

/* ---------- Notifications (contract §7) ---------- */

export type NotificationType =
  | 'MACHINE_BREAKDOWN'
  | 'MACHINE_OUT_OF_SERVICE'
  | 'WORK_ORDER_ASSIGNED'
  | 'MAINTENANCE_DUE'
  | 'PASSWORD_RESET';

export interface Notification {
  id: number;
  type?: NotificationType;
  title: string;
  message: string;
  machineId?: number | null;
  workOrderId?: number | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationQuery {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
}

/* ---------- Dashboard ---------- */

export interface DashboardData {
  users: {
    total: number;
    active: number;
    disabled: number;
    locked: number;
    neverLoggedIn: number;
    byRole: Array<{ role: UserRole; _count: { _all: number } }>;
    newUsersPerMonth: Array<{ month: string; count: number }>;
    recentLogins: Array<{ id: number; username: string; fullName: string; lastLoginAt: string }>;
    recentlyCreated: Array<{ id: number; username: string; fullName: string; createdAt: string }>;
  };
  workOrders: {
    open: number;
    inProgress: number;
    doneThisMonth: number;
    byPriority: Array<{ priority: WorkOrderPriority; count: number }>;
  };
  employees: {
    total: number;
    byDepartment: Array<{ department: string; count: number }>;
  };
  machines: {
    total: number;
    byStatus: Array<{ maintenanceStatus: MachineStatus; _count: { _all: number } }>;
    byType: Array<{ type: MachineType; _count: { _all: number } }>;
    overdueMaintenance: number;
    machinesInBreakdown: Machine[];
    recentStatusChanges: Array<{
      id: number;
      fromStatus: MachineStatus | null;
      toStatus: MachineStatus;
      changedAt: string;
      machine: Pick<Machine, 'id' | 'code' | 'name'>;
      changedBy: { fullName: string };
    }>;
  };
}

export interface MyDashboardData {
  myOpenWorkOrders: WorkOrder[];
  machinesInBreakdown: number;
  overdueMaintenance: number;
  unreadNotifications: number;
  hr?: { employees: number; onLeave: number };
}

export interface AssistantStatus {
  enabled: boolean;
  model: string | null;
}

export interface Conversation {
  id: number;
  title: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed: string[];
  createdAt: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}
