import jwt from "jsonwebtoken";

/** Shared fixtures and a mocked Prisma client for the integration tests (no database needed). */
export const admin = {
  id: 1, username: "admin", fullName: "Administrator", email: "admin@example.com",
  role: "ADMIN", enabled: true, employeeId: null, passwordHash: "hash",
  lastLoginAt: null, mustChangePassword: false,
};
export const employeeUser = { ...admin, id: 2, username: "employee", role: "EMPLOYEE" };
export const techUser = { ...admin, id: 4, username: "tech", role: "MAINTENANCE_TECH" };
export const freshUser = { ...admin, id: 5, username: "fresh", role: "HR_MANAGER", mustChangePassword: true };
export const hrUser = { ...admin, id: 6, username: "hr", role: "HR_MANAGER" };
export const workerUser = { ...admin, id: 8, username: "worker", role: "EMPLOYEE", employeeId: 7 };

export const users = { admin, employee: employeeUser, tech: techUser, fresh: freshUser, hr: hrUser, worker: workerUser };
export type TestUser = keyof typeof users;

export const machineRow: Record<string, unknown> = {
  id: 10, code: "PRESS-001", name: "Press", type: "PRESS", maintenanceStatus: "OUT_OF_SERVICE",
  deletedAt: null, nextMaintenanceDueAt: null,
};

export const mockPrisma = {
  user: {
    groupBy: jest.fn(async (_args?: unknown): Promise<object[]> => []),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(async ({ where }: { where: { id: number } }) =>
      Object.values(users).find((user) => user.id === where.id) ?? employeeUser),
    findMany: jest.fn(async (_args?: unknown): Promise<object[]> => [admin]),
    count: jest.fn(async () => 1),
    updateMany: jest.fn(async () => ({ count: 0 })),
    create: jest.fn(async ({ data }: { data: object }) => ({ ...admin, ...data, id: 3 })),
  },
  employee: {
    groupBy: jest.fn(async (_args?: unknown): Promise<object[]> => []),
    findMany: jest.fn(async (_args?: unknown) => []),
    count: jest.fn(async () => 0),
    findFirst: jest.fn(async () => null),
    create: jest.fn(),
    update: jest.fn(),
  },
  machine: {
    groupBy: jest.fn(async (_args?: unknown): Promise<object[]> => []),
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    findFirst: jest.fn(async (): Promise<Record<string, unknown>> => machineRow),
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 11, ...data })),
    update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...machineRow, ...data })),
  },
  department: {
    findUnique: jest.fn(async (): Promise<Record<string, unknown> | null> => null),
    findMany: jest.fn(async () => []),
    delete: jest.fn(async () => ({})),
  },
  machineStatusLog: {
    create: jest.fn(async () => ({})),
    findMany: jest.fn(async (_args?: unknown): Promise<object[]> => []),
  },
  notification: {
    count: jest.fn(async (_args?: unknown) => 0),
    updateMany: jest.fn(async (_args?: unknown) => ({ count: 1 })),
    createMany: jest.fn(async (_args?: unknown) => ({ count: 0 })),
    create: jest.fn(async () => ({})),
    findMany: jest.fn(async (_args?: unknown): Promise<object[]> => []),
  },
  auditLog: { create: jest.fn(async () => ({})) },
  maintenancePlan: {
    create: jest.fn(async ({ data }: { data: object }): Promise<object> => ({ id: 1, ...data })),
    aggregate: jest.fn(async () => ({ _min: { nextDueDate: null } })),
    findMany: jest.fn(async (_args?: unknown): Promise<object[]> => []),
    findFirst: jest.fn(async (): Promise<object | null> => null),
    count: jest.fn(async () => 0),
    update: jest.fn(async (_args?: unknown) => ({})),
    delete: jest.fn(async () => ({})),
  },
  workOrder: {
    groupBy: jest.fn(async (_args?: unknown): Promise<object[]> => []),
    create: jest.fn(async ({ data }: { data: object }) => ({ id: 1, status: "OPEN", ...data })),
    findFirst: jest.fn(async (): Promise<object | null> => null),
    update: jest.fn(),
    count: jest.fn(async () => 0),
    findMany: jest.fn(async (_args?: unknown) => []),
  },
  assistantConversation: {
    findFirst: jest.fn(async (_args?: unknown): Promise<object | null> => null),
    findMany: jest.fn(async (_args?: unknown): Promise<object[]> => []),
    create: jest.fn(async ({ data }: { data: object }) => ({ id: 5, title: "Nouvelle conversation", createdAt: new Date(), updatedAt: new Date(), ...data })),
    update: jest.fn(async (_args?: unknown) => ({})),
    delete: jest.fn(async (_args?: unknown) => ({})),
    deleteMany: jest.fn(async (_args?: unknown) => ({ count: 0 })),
  },
  assistantMessage: {
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: Math.floor(Math.random() * 1e6), createdAt: new Date(), toolCalls: null, latencyMs: null, ...data })),
    findMany: jest.fn(async (_args?: unknown): Promise<object[]> => []),
    count: jest.fn(async (_args?: unknown) => 1),
  },
  $transaction: jest.fn(async (operations: unknown): Promise<unknown> =>
    typeof operations === "function" ? operations(mockPrisma) : Promise.all(operations as Promise<unknown>[])),
};

/** Restores the default behaviour of the mocks; registered as a global beforeEach in setup-mocks.ts. */
export const resetMocks = (): void => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; id?: number } }) =>
    Object.values(users).find((user) => user.username === where.username || user.id === where.id) ?? null);
  mockPrisma.user.findFirst.mockResolvedValue(null);
  mockPrisma.user.findMany.mockImplementation(async (_args?: unknown) => [admin]);
  mockPrisma.machine.findFirst.mockResolvedValue(machineRow);
  mockPrisma.employee.findFirst.mockResolvedValue(null);
  mockPrisma.workOrder.findFirst.mockResolvedValue(null);
  mockPrisma.maintenancePlan.findFirst.mockResolvedValue(null);
};

/** A valid access token for one of the fixture users (the API loads the user again from the mocked DB). */
export const tokenFor = (name: string): string => {
  const user = users[name as TestUser];
  if (!user) throw new Error(`Unknown test user: ${name}`);
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, employeeId: user.employeeId, mustChangePassword: user.mustChangePassword },
    process.env.JWT_SECRET as string,
    { expiresIn: "15m" },
  );
};
