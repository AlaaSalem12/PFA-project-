process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-access-secret-that-is-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-at-least-32-characters";
process.env.CORS_ORIGIN = "http://localhost:4200,http://127.0.0.1:4200";

const admin = {
  id: 1, username: "admin", fullName: "Administrator", email: "admin@example.com",
  role: "ADMIN", enabled: true, employeeId: null, passwordHash: "hash",
  lastLoginAt: null, mustChangePassword: false,
};
const employeeUser = { ...admin, id: 2, username: "employee", role: "EMPLOYEE" };
const techUser = { ...admin, id: 4, username: "tech", role: "MAINTENANCE_TECH" };
const freshUser = { ...admin, id: 5, username: "fresh", role: "HR_MANAGER", mustChangePassword: true };
const machineRow = {
  id: 10, code: "PRESS-001", name: "Press", type: "PRESS", maintenanceStatus: "OUT_OF_SERVICE",
  deletedAt: null, nextMaintenanceDueAt: null,
};
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(async ({ where }: { where: { id: number } }) =>
      [admin, employeeUser, techUser, freshUser].find((user) => user.id === where.id) ?? employeeUser),
    findMany: jest.fn(async () => [admin]),
    count: jest.fn(async () => 1),
    create: jest.fn(async ({ data }: { data: object }) => ({ ...admin, ...data, id: 3 })),
  },
  employee: {
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    findFirst: jest.fn(async () => null),
    create: jest.fn(),
    update: jest.fn(),
  },
  machine: {
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    findFirst: jest.fn(async () => machineRow),
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 11, ...data })),
    update: jest.fn(async ({ data }: { data: object }) => ({ ...machineRow, ...data })),
  },
  machineStatusLog: { create: jest.fn(async () => ({})) },
  notification: { createMany: jest.fn(async () => ({ count: 0 })) },
  auditLog: { create: jest.fn(async () => ({})) },
  maintenancePlan: {
    create: jest.fn(async ({ data }: { data: object }) => ({ id: 1, ...data })),
    aggregate: jest.fn(async () => ({ _min: { nextDueDate: null } })),
  },
  workOrder: {
    create: jest.fn(async ({ data }: { data: object }) => ({ id: 1, status: "OPEN", ...data })),
    findFirst: jest.fn(async (): Promise<object | null> => null),
    update: jest.fn(),
  },
  $transaction: jest.fn(async (operations: unknown): Promise<unknown> =>
    typeof operations === "function" ? operations(mockPrisma) : Promise.all(operations as Promise<unknown>[])),
};

jest.mock("./config/prisma", () => ({ prisma: mockPrisma }));
jest.mock("bcrypt", () => ({
  compare: jest.fn(async (password: string) => password === "Admin@123"),
  hash: jest.fn(async () => "hashed-password"),
}));

import request from "supertest";
import { Prisma } from "@prisma/client";
import { app } from "./app";

describe("API integration contracts", () => {
  let adminToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; id?: number } }) => {
      if (where.username === "admin" || where.id === 1) return admin;
      if (where.username === "employee" || where.id === 2) return employeeUser;
      if (where.username === "tech" || where.id === 4) return techUser;
      if (where.username === "fresh" || where.id === 5) return freshUser;
      return null;
    });
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.machine.findFirst.mockResolvedValue(machineRow);
    mockPrisma.employee.findFirst.mockResolvedValue(null);
    mockPrisma.workOrder.findFirst.mockResolvedValue(null);
  });

  const tokenFor = async (username: string): Promise<string> =>
    (await request(app).post("/api/v1/auth/login").send({ username, password: "Admin@123" })).body.token;

  it("reports health", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
  });

  it.each(["http://localhost:4200", "http://127.0.0.1:4200"])("allows frontend origin %s", async (origin) => {
    const response = await request(app).options("/api/v1/auth/login").set("Origin", origin);
    expect(response.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("supports login, refresh, me, and password change", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ username: "admin", password: "Admin@123" });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
    expect(login.body.user.passwordHash).toBeUndefined();
    adminToken = login.body.token;

    const refresh = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: login.body.refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.token).toBeDefined();
    expect(refresh.body.user.passwordHash).toBeUndefined();

    const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${adminToken}`);
    expect(me.status).toBe(200);
    expect(me.body.passwordHash).toBeUndefined();

    const changed = await request(app).post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ currentPassword: "Admin@123", newPassword: "NewPassword@123" });
    expect(changed.status).toBe(204);
  });

  it("rejects invalid login and unauthenticated requests", async () => {
    expect((await request(app).post("/api/v1/auth/login").send({ username: "admin", password: "wrong" })).status).toBe(401);
    expect((await request(app).get("/api/v1/users")).status).toBe(401);
    expect((await request(app).get("/api/v1/employees")).status).toBe(401);
  });

  it("lists and creates users for admins without exposing credentials", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ username: "admin", password: "Admin@123" });
    const list = await request(app).get("/api/v1/users?page=0&size=10&sort=id,desc&search=")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(list.body).toMatchObject({ totalElements: 1, totalPages: 1, number: 0, size: 10 });
    expect(list.body.content[0].passwordHash).toBeUndefined();

    const created = await request(app).post("/api/v1/users")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ username: "samira.benali", fullName: "Samira Benali", email: "samira@metalworks.com", role: "EMPLOYEE" });
    expect(created.status).toBe(201);
    expect(created.body.user.username).toBeDefined();
    expect(created.body.user.mustChangePassword).toBe(true);
    expect(created.body.user.passwordHash).toBeUndefined();
  });

  it("forbids non-admin users and validates user creation", async () => {
    const employeeLogin = await request(app).post("/api/v1/auth/login").send({ username: "employee", password: "Admin@123" });
    expect((await request(app).get("/api/v1/users").set("Authorization", `Bearer ${employeeLogin.body.token}`)).status).toBe(403);
    const adminLogin = await request(app).post("/api/v1/auth/login").send({ username: "admin", password: "Admin@123" });
    expect((await request(app).post("/api/v1/users").set("Authorization", `Bearer ${adminLogin.body.token}`).send({ fullName: "x" })).status).toBe(400);
  });

  it("handles username collisions and duplicate emails safely", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ username: "admin", password: "Admin@123" });
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; id?: number } }) => {
      if (where.id === 1) return admin;
      return null;
    });
    mockPrisma.user.findFirst.mockImplementation(async ({ where }: { where: { OR?: Array<{ username?: string; email?: string }> } }) => {
      if (where.OR?.some((condition) => condition.username === "samira.benali")) return { ...admin, username: "samira.benali" };
      return null;
    });
    const collision = await request(app).post("/api/v1/users")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ username: "samira.benali2", fullName: "Samira Benali", email: "samira2@metalworks.com", role: "EMPLOYEE" });
    expect(collision.status).toBe(201);
    expect(collision.body.user.username).toBe("samira.benali2");
    expect(collision.body.user.passwordHash).toBeUndefined();

    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; id?: number } }) =>
      where.id === 1 ? admin : null);
    mockPrisma.user.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed", { code: "P2002", clientVersion: "6.19.3" },
    ));
    const duplicate = await request(app).post("/api/v1/users")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ username: "another.user", fullName: "Another User", email: "samira2@metalworks.com", role: "EMPLOYEE" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toMatch(/email/i);
  });

  it("returns the employee pagination contract", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ username: "admin", password: "Admin@123" });
    const response = await request(app).get("/api/v1/employees?page=0&size=10&sort=id,desc&search=")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it("maps malformed JSON and Prisma errors to 4xx responses", async () => {
    const token = await tokenFor("admin");
    const malformed = await request(app).post("/api/v1/users").set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "application/json").send("{ not json");
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toBe("Bad Request");

    mockPrisma.employee.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed", { code: "P2002", clientVersion: "6.19.3", meta: { target: ["matricule"] } },
    ));
    const duplicate = await request(app).post("/api/v1/employees").set("Authorization", `Bearer ${token}`)
      .send({ matricule: "EMP-1", firstName: "A", lastName: "B", hireDate: "2024-01-01" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toMatch(/matricule/);

    const missing = await request(app).put("/api/v1/employees/99").set("Authorization", `Bearer ${token}`).send({ firstName: "X" });
    expect(missing.status).toBe(404);
  });

  it("uses proper reason phrases and returns 403 for disallowed CORS origins", async () => {
    const unauthorized = await request(app).get("/api/v1/machines");
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.body.error).toBe("Unauthorized");
    const blocked = await request(app).get("/health").set("Origin", "http://evil.example");
    expect(blocked.status).toBe(403);
  });

  it("returns JSON 404 for unknown routes and 409 CONFLICT for duplicate user create", async () => {
    const unknown = await request(app).get("/api/v1/nope");
    expect(unknown.status).toBe(404);
    expect(unknown.body).toMatchObject({ status: 404, error: "Not Found", code: "NOT_FOUND", path: "/api/v1/nope", fieldErrors: [] });

    const token = await tokenFor("admin");
    mockPrisma.user.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed", { code: "P2002", clientVersion: "6.19.3", meta: { target: ["email"] } },
    ));
    const dup = await request(app).post("/api/v1/users").set("Authorization", `Bearer ${token}`)
      .send({ username: "dup.user", fullName: "Dup User", email: "dup@metal.local", role: "EMPLOYEE" });
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ error: "Conflict", code: "CONFLICT", message: expect.stringMatching(/email/i) });
  });

  it("does not let the organization router block machines for non-HR roles", async () => {
    const token = await tokenFor("employee");
    expect((await request(app).get("/api/v1/machines").set("Authorization", `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).get("/api/v1/departments").set("Authorization", `Bearer ${token}`)).status).toBe(403);
  });

  it("requires a password change before using employee and organization routes", async () => {
    const token = await tokenFor("fresh");
    const employees = await request(app).get("/api/v1/employees").set("Authorization", `Bearer ${token}`);
    expect(employees.status).toBe(403);
    expect(employees.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    const departments = await request(app).get("/api/v1/departments").set("Authorization", `Bearer ${token}`);
    expect(departments.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("creates HR managers and writes an audit entry", async () => {
    const token = await tokenFor("admin");
    const created = await request(app).post("/api/v1/users").set("Authorization", `Bearer ${token}`)
      .send({ username: "hr.new", fullName: "HR New", email: "hr.new@metal.local", role: "HR_MANAGER" });
    expect(created.status).toBe(201);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "CREATE", entity: "User", userId: 1 }),
    }));
  });

  it("ignores maintenanceStatus on machine create", async () => {
    const token = await tokenFor("admin");
    const response = await request(app).post("/api/v1/machines").set("Authorization", `Bearer ${token}`)
      .send({ code: "CNC-9", name: "CNC", type: "CNC", maintenanceStatus: "BREAKDOWN" });
    expect(response.status).toBe(201);
    expect(mockPrisma.machine.create.mock.calls[0][0].data.maintenanceStatus).toBeUndefined();
  });

  it("lets only admins restore an out-of-service machine", async () => {
    const asTech = await request(app).patch("/api/v1/machines/10/status")
      .set("Authorization", `Bearer ${await tokenFor("tech")}`).send({ status: "OPERATIONAL" });
    expect(asTech.status).toBe(409);
    const asAdmin = await request(app).patch("/api/v1/machines/10/status")
      .set("Authorization", `Bearer ${await tokenFor("admin")}`).send({ status: "OPERATIONAL" });
    expect(asAdmin.status).toBe(200);
    expect(mockPrisma.machineStatusLog.create).toHaveBeenCalled();
  });

  it("manages work orders with role checks and a status workflow", async () => {
    const forbidden = await request(app).post("/api/v1/work-orders")
      .set("Authorization", `Bearer ${await tokenFor("employee")}`).send({ machineId: 10, type: "CORRECTIVE" });
    expect(forbidden.status).toBe(403);

    const techToken = await tokenFor("tech");
    const created = await request(app).post("/api/v1/work-orders").set("Authorization", `Bearer ${techToken}`)
      .send({ machineId: 10, type: "CORRECTIVE", description: "Replace seal" });
    expect(created.status).toBe(201);
    expect(created.body.priority).toBe("MEDIUM");

    mockPrisma.workOrder.findFirst.mockResolvedValue({ id: 1, machineId: 10, type: "CORRECTIVE", status: "OPEN" });
    const skipped = await request(app).patch("/api/v1/work-orders/1/status")
      .set("Authorization", `Bearer ${techToken}`).send({ status: "DONE" });
    expect(skipped.status).toBe(409);

    mockPrisma.workOrder.update.mockResolvedValue({ id: 1, status: "IN_PROGRESS" });
    const started = await request(app).patch("/api/v1/work-orders/1/status")
      .set("Authorization", `Bearer ${techToken}`).send({ status: "IN_PROGRESS" });
    expect(started.status).toBe(200);
  });

  it("creates maintenance plans for maintainers only", async () => {
    const body = { machineId: 10, task: "Lubricate", frequencyDays: 30, nextDueDate: "2030-01-01" };
    const forbidden = await request(app).post("/api/v1/maintenance/plans")
      .set("Authorization", `Bearer ${await tokenFor("employee")}`).send(body);
    expect(forbidden.status).toBe(403);
    const techToken = await tokenFor("tech");
    const created = await request(app).post("/api/v1/maintenance/plans").set("Authorization", `Bearer ${techToken}`).send(body);
    expect(created.status).toBe(201);
    const invalid = await request(app).post("/api/v1/maintenance/plans")
      .set("Authorization", `Bearer ${techToken}`).send({ ...body, frequencyDays: 0 });
    expect(invalid.status).toBe(400);
  });
});
