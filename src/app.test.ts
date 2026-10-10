process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-access-secret-that-is-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-at-least-32-characters";
process.env.CORS_ORIGIN = "http://localhost:4200,http://127.0.0.1:4200";
process.env.UPLOADS_DIR = require("node:path").join(require("node:os").tmpdir(), "metalhr-test-uploads");

const admin = {
  id: 1, username: "admin", fullName: "Administrator", email: "admin@example.com",
  role: "ADMIN", enabled: true, employeeId: null, passwordHash: "hash",
  lastLoginAt: null, mustChangePassword: false,
};
const employeeUser = { ...admin, id: 2, username: "employee", role: "EMPLOYEE" };
const techUser = { ...admin, id: 4, username: "tech", role: "MAINTENANCE_TECH" };
const workerUser = { ...admin, id: 8, username: "worker", role: "EMPLOYEE", employeeId: 7 };
const hrUser = { ...admin, id: 6, username: "hr", role: "HR_MANAGER" };
const freshUser = { ...admin, id: 5, username: "fresh", role: "HR_MANAGER", mustChangePassword: true };
const machineRow: Record<string, unknown> = {
  id: 10, code: "PRESS-001", name: "Press", type: "PRESS", maintenanceStatus: "OUT_OF_SERVICE",
  deletedAt: null, nextMaintenanceDueAt: null,
};
const mockPrisma = {
  user: {
    groupBy: jest.fn(async (_args?: unknown): Promise<object[]> => []),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(async ({ where }: { where: { id: number } }) =>
      [admin, employeeUser, techUser, freshUser, hrUser, workerUser].find((user) => user.id === where.id) ?? employeeUser),
    findMany: jest.fn(async () => [admin]),
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
import { mailService } from "./modules/mail/mail.service";
import { runMaintenanceDueCheck } from "./modules/maintenance-plan/maintenance-due.job";

describe("API integration contracts", () => {
  let adminToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; id?: number } }) => {
      if (where.username === "admin" || where.id === 1) return admin;
      if (where.username === "employee" || where.id === 2) return employeeUser;
      if (where.username === "tech" || where.id === 4) return techUser;
      if (where.username === "fresh" || where.id === 5) return freshUser;
      if (where.username === "hr" || where.id === 6) return hrUser;
      if (where.username === "worker" || where.id === 8) return workerUser;
      return null;
    });
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.machine.findFirst.mockResolvedValue(machineRow);
    mockPrisma.employee.findFirst.mockResolvedValue(null);
    mockPrisma.workOrder.findFirst.mockResolvedValue(null);
    mockPrisma.maintenancePlan.findFirst.mockResolvedValue(null);
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

  it("logs in case-insensitively and reports locked accounts as 401 ACCOUNT_LOCKED", async () => {
    const ok = await request(app).post("/api/v1/auth/login").send({ username: " ADMIN ", password: "Admin@123" });
    expect(ok.status).toBe(200);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...admin, lockedUntil: new Date(Date.now() + 60_000) });
    const locked = await request(app).post("/api/v1/auth/login").send({ username: "admin", password: "Admin@123" });
    expect(locked.status).toBe(401);
    expect(locked.body.code).toBe("ACCOUNT_LOCKED");
    expect(locked.body.message).toBe("Account temporarily locked. Try again later.");
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
      data: expect.objectContaining({ action: "USER_CREATED", entity: "User", userId: 1 }),
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

  describe("machines (P1-04)", () => {
    it("strips maintenanceStatus and imageUrl from PUT bodies", async () => {
      const token = await tokenFor("admin");
      const response = await request(app).put("/api/v1/machines/10").set("Authorization", `Bearer ${token}`)
        .send({ name: "Renamed", maintenanceStatus: "OPERATIONAL", imageUrl: "https://x.test/a.png", brand: "  " });
      expect(response.status).toBe(200);
      const data = mockPrisma.machine.update.mock.calls[0][0].data;
      expect(data.name).toBe("Renamed");
      expect(data).not.toHaveProperty("maintenanceStatus");
      expect(data).not.toHaveProperty("imageUrl");
      expect(data.brand).toBeUndefined();
    });

    it("serializes Decimal fields as numbers", async () => {
      const token = await tokenFor("employee");
      mockPrisma.machine.findMany.mockResolvedValueOnce([{ ...machineRow, hourlyCost: "85.50", operatingHours: "1200.00" }] as never);
      const response = await request(app).get("/api/v1/machines").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.content[0].hourlyCost).toBe(85.5);
      expect(response.body.content[0].operatingHours).toBe(1200);
    });

    it("moves a finished maintenance back to OPERATIONAL and reschedules the next one", async () => {
      mockPrisma.machine.findFirst.mockResolvedValue({ ...machineRow, maintenanceStatus: "UNDER_MAINTENANCE", maintenanceIntervalDays: 30 });
      const response = await request(app).patch("/api/v1/machines/10/status")
        .set("Authorization", `Bearer ${await tokenFor("tech")}`).send({ status: "OPERATIONAL" });
      expect(response.status).toBe(200);
      const data = mockPrisma.machine.update.mock.calls[0][0].data as { lastMaintenanceAt: Date; nextMaintenanceDueAt: Date };
      expect(data.lastMaintenanceAt).toBeInstanceOf(Date);
      const days = (data.nextMaintenanceDueAt.getTime() - data.lastMaintenanceAt.getTime()) / 86_400_000;
      expect(Math.round(days)).toBe(30);
    });

    it("only lets ADMIN and PRODUCTION_MANAGER set operators and rejects unknown employees", async () => {
      const forbidden = await request(app).put("/api/v1/machines/10/operators")
        .set("Authorization", `Bearer ${await tokenFor("tech")}`).send({ employeeIds: [1] });
      expect(forbidden.status).toBe(403);
      mockPrisma.employee.count.mockResolvedValueOnce(1);
      const unknown = await request(app).put("/api/v1/machines/10/operators")
        .set("Authorization", `Bearer ${await tokenFor("admin")}`).send({ employeeIds: [1, 2] });
      expect(unknown.status).toBe(400);
      expect(unknown.body.code).toBe("VALIDATION_ERROR");
    });

    it("accepts a real PNG upload and rejects a fake image", async () => {
      const token = await tokenFor("admin");
      const fake = await request(app).post("/api/v1/machines/10/image").set("Authorization", `Bearer ${token}`)
        .attach("image", Buffer.from("not an image"), { filename: "x.png", contentType: "image/png" });
      expect(fake.status).toBe(400);
      const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
      const ok = await request(app).post("/api/v1/machines/10/image").set("Authorization", `Bearer ${token}`)
        .attach("image", png, { filename: "x.png", contentType: "image/png" });
      expect(ok.status).toBe(200);
      expect(ok.body.imageUrl).toMatch(/^\/uploads\/machines\/10-\d+\.png$/);
      const served = await request(app).get(ok.body.imageUrl);
      expect(served.status).toBe(200);
    });
  });

  describe("users (P1-05)", () => {
    const post = async (body: object) => request(app).post("/api/v1/users")
      .set("Authorization", `Bearer ${await tokenFor("admin")}`).send(body);

    it("generates a username from the e-mail when none is sent", async () => {
      const response = await post({ fullName: "New Person", email: "New.Person@Metal.local", role: "EMPLOYEE" });
      expect(response.status).toBe(201);
      expect(response.body.user.username).toBe("new.person");
      expect(response.body.user.email).toBe("new.person@metal.local");
      expect(response.body.emailSent).toBe(true);
      expect(response.body.temporaryPassword).toBeUndefined();
    });

    it("appends a numeric suffix when the generated username is taken", async () => {
      mockPrisma.user.findFirst.mockImplementation(async ({ where }: { where: { username?: string; OR?: unknown } }) =>
        where.username === "taken" ? { ...admin, username: "taken" } : null);
      const response = await post({ fullName: "Taken Two", email: "taken@metal.local", role: "HR_MANAGER" });
      expect(response.status).toBe(201);
      expect(response.body.user.username).toBe("taken2");
    });

    it("returns the temporary password only when the e-mail could not be sent", async () => {
      const spy = jest.spyOn(mailService, "sendWelcome").mockRejectedValueOnce(new Error("smtp down"));
      const response = await post({ fullName: "No Mail", email: "no.mail@metal.local", role: "EMPLOYEE" });
      expect(response.status).toBe(201);
      expect(response.body.emailSent).toBe(false);
      expect(typeof response.body.temporaryPassword).toBe("string");
      spy.mockRestore();
    });

    it("unlocks a user and audits USER_UNLOCKED", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ ...employeeUser, lockedUntil: new Date(Date.now() + 60_000) });
      const response = await request(app).post("/api/v1/users/2/unlock").set("Authorization", `Bearer ${await tokenFor("admin")}`);
      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { lockedUntil: null, failedLoginAttempts: 0 },
      }));
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: "USER_UNLOCKED", entityId: "2" }),
      }));
    });

    it("no longer exposes the /admin/users alias or resend-credentials", async () => {
      const token = await tokenFor("admin");
      expect((await request(app).get("/api/v1/admin/users").set("Authorization", `Bearer ${token}`)).status).toBe(404);
      expect((await request(app).post("/api/v1/users/2/resend-credentials").set("Authorization", `Bearer ${token}`)).status).toBe(404);
    });
  });

  describe("HR (P1-06)", () => {
    const employeeRow = {
      id: 7, matricule: "EMP-7", firstName: "Ada", lastName: "Lovelace", birthDate: null,
      hireDate: new Date("2020-01-01"), status: "ACTIVE", department: null, position: null, user: null,
      authorizedMachines: [],
    };

    it("filters the employee list by status, department and position", async () => {
      const token = await tokenFor("admin");
      const response = await request(app).get("/api/v1/employees?status=ON_LEAVE&departmentId=2&positionId=3&search=ada")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      const where = mockPrisma.employee.findMany.mock.calls[0][0] as unknown as { where: Record<string, unknown> };
      expect(where.where).toMatchObject({ deletedAt: null, status: "ON_LEAVE", departmentId: 2, positionId: 3 });
      expect(where.where.OR).toHaveLength(4);
      expect((await request(app).get("/api/v1/employees?status=BOGUS").set("Authorization", `Bearer ${token}`)).status).toBe(400);
    });

    it("lets a technician use /employees/options but not the HR list", async () => {
      const token = await tokenFor("tech");
      expect((await request(app).get("/api/v1/employees/options?search=a").set("Authorization", `Bearer ${token}`)).status).toBe(200);
      expect((await request(app).get("/api/v1/employees").set("Authorization", `Bearer ${token}`)).status).toBe(403);
      const employeeToken = await tokenFor("employee");
      expect((await request(app).get("/api/v1/employees/options").set("Authorization", `Bearer ${employeeToken}`)).status).toBe(403);
    });

    it("refuses to delete a department that still has employees", async () => {
      mockPrisma.department.findUnique.mockResolvedValueOnce({ id: 1, name: "Welding", _count: { employees: 2 } });
      const response = await request(app).delete("/api/v1/departments/1").set("Authorization", `Bearer ${await tokenFor("admin")}`);
      expect(response.status).toBe(409);
      expect(response.body.code).toBe("CONFLICT");
      expect(mockPrisma.department.delete).not.toHaveBeenCalled();
    });

    it("deletes an empty department and returns 404 for an unknown one", async () => {
      const token = await tokenFor("admin");
      mockPrisma.department.findUnique.mockResolvedValueOnce({ id: 1, name: "Empty", _count: { employees: 0 } });
      expect((await request(app).delete("/api/v1/departments/1").set("Authorization", `Bearer ${token}`)).status).toBe(204);
      expect((await request(app).delete("/api/v1/departments/99").set("Authorization", `Bearer ${token}`)).status).toBe(404);
    });

    it("refuses to delete an employee with open work orders", async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(employeeRow as never);
      mockPrisma.workOrder.count.mockResolvedValueOnce(2);
      const response = await request(app).delete("/api/v1/employees/7").set("Authorization", `Bearer ${await tokenFor("admin")}`);
      expect(response.status).toBe(409);
      expect(mockPrisma.employee.update).not.toHaveBeenCalled();
    });

    it("rejects a birth date after the hire date and a malformed phone number", async () => {
      const token = await tokenFor("hr");
      const base = { matricule: "EMP-9", firstName: "A", lastName: "B", hireDate: "2020-01-01" };
      const dates = await request(app).post("/api/v1/employees").set("Authorization", `Bearer ${token}`)
        .send({ ...base, birthDate: "2021-01-01" });
      expect(dates.status).toBe(400);
      expect(dates.body.fieldErrors[0].field).toBe("birthDate");
      const phone = await request(app).post("/api/v1/employees").set("Authorization", `Bearer ${token}`)
        .send({ ...base, phone: "abc" });
      expect(phone.status).toBe(400);
    });
  });

  describe("work orders (P1-07)", () => {
    const makeOrder = (over: Record<string, unknown> = {}) => ({
      id: 11, machineId: 10, type: "CORRECTIVE", priority: "HIGH", status: "OPEN", description: "Replace the hydraulic seal",
      assignedToId: null, openedAt: new Date(), closedAt: null, cost: null, partsUsed: null, resolution: null,
      machine: { id: 10, code: "PRESS-001", name: "Press" }, assignedTo: null, createdBy: { id: 1, fullName: "Administrator" },
      ...over,
    });
    const operational = { ...machineRow, maintenanceStatus: "OPERATIONAL" };
    const patch = async (user: string, body: object) => request(app).patch("/api/v1/work-orders/11/status")
      .set("Authorization", `Bearer ${await tokenFor(user)}`).send(body);

    it("rejects OPEN -> DONE and invalid transitions with 409", async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(makeOrder());
      const skipped = await patch("tech", { status: "DONE", resolution: "Fixed" });
      expect(skipped.status).toBe(409);
      expect(skipped.body.code).toBe("CONFLICT");
      mockPrisma.workOrder.findFirst.mockResolvedValue(makeOrder({ status: "DONE" }));
      expect((await patch("tech", { status: "OPEN" })).status).toBe(409);
      expect(mockPrisma.workOrder.update).not.toHaveBeenCalled();
    });

    it("requires a resolution to close and sets closedAt, cost as a number", async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(makeOrder({ status: "IN_PROGRESS" }));
      const missing = await patch("tech", { status: "DONE" });
      expect(missing.status).toBe(400);
      expect(missing.body.fieldErrors[0].field).toBe("resolution");
      mockPrisma.workOrder.update.mockResolvedValue(makeOrder({ status: "DONE", closedAt: new Date(), cost: "125.50", resolution: "Seal replaced" }));
      const closed = await patch("tech", { status: "DONE", resolution: "Seal replaced", cost: 125.5, partsUsed: "Seal kit" });
      expect(closed.status).toBe(200);
      expect(closed.body.cost).toBe(125.5);
      const data = mockPrisma.workOrder.update.mock.calls[0][0] as unknown as { data: { closedAt: Date; status: string } };
      expect(data.data.status).toBe("DONE");
      expect(data.data.closedAt).toBeInstanceOf(Date);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: "WORK_ORDER_STATUS_CHANGED" }),
      }));
    });

    it("cannot edit a DONE order and only ADMIN or PRODUCTION_MANAGER may edit", async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(makeOrder({ status: "DONE" }));
      const put = async (user: string) => request(app).put("/api/v1/work-orders/11")
        .set("Authorization", `Bearer ${await tokenFor(user)}`).send({ priority: "LOW" });
      expect((await put("tech")).status).toBe(403);
      expect((await put("admin")).status).toBe(409);
    });

    it("EMPLOYEE only sees own work orders (list forced to mine, detail checked)", async () => {
      const unlinked = await request(app).get("/api/v1/work-orders").set("Authorization", `Bearer ${await tokenFor("employee")}`);
      expect(unlinked.status).toBe(200);
      expect(unlinked.body.content).toEqual([]);
      expect(mockPrisma.workOrder.findMany).not.toHaveBeenCalled();

      const token = await tokenFor("worker");
      const list = await request(app).get("/api/v1/work-orders?assignedToId=99").set("Authorization", `Bearer ${token}`);
      expect(list.status).toBe(200);
      const call = mockPrisma.workOrder.findMany.mock.calls[0][0] as unknown as { where: { assignedToId: number } };
      expect(call.where.assignedToId).toBe(7);

      mockPrisma.workOrder.findFirst.mockResolvedValue(makeOrder({ assignedTo: { id: 9, firstName: "Other", lastName: "Person" } }));
      expect((await request(app).get("/api/v1/work-orders/11").set("Authorization", `Bearer ${token}`)).status).toBe(403);
      mockPrisma.workOrder.findFirst.mockResolvedValue(makeOrder({ assignedTo: { id: 7, firstName: "Me", lastName: "Myself" } }));
      expect((await request(app).get("/api/v1/work-orders/11").set("Authorization", `Bearer ${token}`)).status).toBe(200);
    });

    it("assigning creates a WORK_ORDER_ASSIGNED notification for the linked user", async () => {
      mockPrisma.machine.findFirst.mockResolvedValue(operational);
      mockPrisma.employee.findFirst.mockResolvedValue({ id: 5, status: "ACTIVE" } as never);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 42 });
      mockPrisma.workOrder.create.mockResolvedValueOnce(makeOrder({ assignedToId: 5, assignedTo: { id: 5, firstName: "Nadia", lastName: "B" } }) as never);
      const response = await request(app).post("/api/v1/work-orders").set("Authorization", `Bearer ${await tokenFor("tech")}`)
        .send({ machineId: 10, type: "CORRECTIVE", priority: "HIGH", description: "Replace the hydraulic seal", assignedToId: 5 });
      expect(response.status).toBe(201);
      expect(response.body.createdBy).toEqual({ id: 1, fullName: "Administrator" });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 42, type: "WORK_ORDER_ASSIGNED", title: "New work order #11", workOrderId: 11,
          message: expect.stringContaining("PRESS-001"),
        }),
      });
    });

    it("rejects work orders for out-of-service machines and inactive assignees", async () => {
      const token = await tokenFor("admin");
      const body = { machineId: 10, type: "CORRECTIVE", description: "x" };
      const outOfService = await request(app).post("/api/v1/work-orders").set("Authorization", `Bearer ${token}`).send(body);
      expect(outOfService.status).toBe(409);
      mockPrisma.machine.findFirst.mockResolvedValue(operational);
      const noAssignee = await request(app).post("/api/v1/work-orders").set("Authorization", `Bearer ${token}`)
        .send({ ...body, assignedToId: 5 });
      expect(noAssignee.status).toBe(400);
      expect(noAssignee.body.fieldErrors[0].field).toBe("assignedToId");
      expect(mockPrisma.workOrder.create).not.toHaveBeenCalled();
    });

    it("forbids EMPLOYEE from creating and lists work orders of a machine with numeric cost", async () => {
      const employeeToken = await tokenFor("employee");
      expect((await request(app).post("/api/v1/work-orders").set("Authorization", `Bearer ${employeeToken}`)
        .send({ machineId: 10, type: "CORRECTIVE", description: "x" })).status).toBe(403);
      mockPrisma.workOrder.findMany.mockResolvedValueOnce([makeOrder({ cost: "10.00" })] as never);
      const list = await request(app).get("/api/v1/machines/10/work-orders").set("Authorization", `Bearer ${employeeToken}`);
      expect(list.status).toBe(200);
      expect(list.body[0].cost).toBe(10);
    });
  });

  describe("maintenance plans (P1-08)", () => {
    const dayMs = 86_400_000;
    const planRow = (over: Record<string, unknown> = {}) => ({
      id: 3, machineId: 10, task: "Lubricate spindle", frequencyDays: 30, nextDueDate: new Date(Date.now() + 5 * dayMs),
      machine: { id: 10, code: "PRESS-001", name: "Press" }, ...over,
    });
    const operational = { ...machineRow, maintenanceStatus: "OPERATIONAL" };

    it("generate creates a PREVENTIVE work order and moves nextDueDate forward", async () => {
      const plan = planRow();
      mockPrisma.maintenancePlan.findFirst.mockResolvedValue(plan as never);
      mockPrisma.machine.findFirst.mockResolvedValue(operational);
      mockPrisma.workOrder.create.mockResolvedValueOnce({
        id: 21, type: "PREVENTIVE", priority: "MEDIUM", status: "OPEN", description: plan.task, machineId: 10,
        assignedTo: null, openedAt: new Date(), closedAt: null, cost: null, partsUsed: null, resolution: null,
        machine: plan.machine, createdBy: { id: 4, fullName: "Tech" },
      } as never);
      const response = await request(app).post("/api/v1/maintenance-plans/3/generate")
        .set("Authorization", `Bearer ${await tokenFor("admin")}`);
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ id: 21, type: "PREVENTIVE", priority: "MEDIUM" });
      const created = mockPrisma.workOrder.create.mock.calls[0][0] as unknown as { data: { type: string; description: string } };
      expect(created.data).toMatchObject({ type: "PREVENTIVE", description: "Lubricate spindle" });
      const update = mockPrisma.maintenancePlan.update.mock.calls[0][0] as unknown as { data: { nextDueDate: Date } };
      expect(update.data.nextDueDate.getTime()).toBe(plan.nextDueDate.getTime() + 30 * dayMs);
    });

    it("restarts an overdue plan from today and refuses out-of-service machines", async () => {
      mockPrisma.maintenancePlan.findFirst.mockResolvedValue(planRow({ nextDueDate: new Date(Date.now() - 90 * dayMs) }) as never);
      const blocked = await request(app).post("/api/v1/maintenance-plans/3/generate")
        .set("Authorization", `Bearer ${await tokenFor("admin")}`);
      expect(blocked.status).toBe(409);
      mockPrisma.machine.findFirst.mockResolvedValue(operational);
      mockPrisma.workOrder.create.mockResolvedValueOnce({
        id: 22, type: "PREVENTIVE", priority: "MEDIUM", status: "OPEN", machine: { id: 10, code: "P", name: "P" },
        assignedTo: null, createdBy: null, cost: null,
      } as never);
      await request(app).post("/api/v1/maintenance-plans/3/generate").set("Authorization", `Bearer ${await tokenFor("admin")}`);
      const update = mockPrisma.maintenancePlan.update.mock.calls[0][0] as unknown as { data: { nextDueDate: Date } };
      expect(update.data.nextDueDate.getTime()).toBeGreaterThan(Date.now() + 29 * dayMs);
    });

    it("serves /due before /:id and restricts reads and writes by role", async () => {
      const tech = await tokenFor("tech");
      expect((await request(app).get("/api/v1/maintenance-plans/due?days=7").set("Authorization", `Bearer ${tech}`)).status).toBe(200);
      expect((await request(app).get("/api/v1/maintenance-plans").set("Authorization", `Bearer ${tech}`)).status).toBe(200);
      const employee = await tokenFor("employee");
      expect((await request(app).get("/api/v1/maintenance-plans").set("Authorization", `Bearer ${employee}`)).status).toBe(403);
      const body = { machineId: 10, task: "Lubricate", frequencyDays: 30, nextDueDate: "2030-01-01" };
      expect((await request(app).post("/api/v1/maintenance-plans").set("Authorization", `Bearer ${tech}`).send(body)).status).toBe(403);
      mockPrisma.machine.findFirst.mockResolvedValue(operational);
      const admin = await tokenFor("admin");
      mockPrisma.maintenancePlan.create.mockResolvedValueOnce(planRow() as never);
      expect((await request(app).post("/api/v1/maintenance-plans").set("Authorization", `Bearer ${admin}`).send(body)).status).toBe(201);
      expect((await request(app).post("/api/v1/maintenance-plans").set("Authorization", `Bearer ${admin}`).send({ ...body, frequencyDays: 0 })).status).toBe(400);
    });

    it("the due check notifies each admin/production manager once per machine per day", async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 9 }] as never);
      mockPrisma.maintenancePlan.findMany.mockResolvedValueOnce([planRow({ nextDueDate: new Date(Date.now() + 3_600_000) })] as never);
      mockPrisma.machine.findMany.mockResolvedValueOnce([{ id: 10, code: "PRESS-001", name: "Press", nextMaintenanceDueAt: new Date(Date.now() - dayMs) }] as never);
      mockPrisma.notification.findMany.mockResolvedValueOnce([{ userId: 1 }] as never);
      const created = await runMaintenanceDueCheck();
      expect(created).toBe(1);
      expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
      const call = mockPrisma.notification.createMany.mock.calls[0] as unknown as [{ data: Array<{ userId: number; type: string; machineId: number }> }];
      expect(call[0].data).toEqual([expect.objectContaining({ userId: 9, type: "MAINTENANCE_DUE", machineId: 10 })]);
    });
  });

  describe("notifications and dashboards (P1-09)", () => {
    it("lists own notifications as a Page, honoring unreadOnly", async () => {
      mockPrisma.notification.findMany.mockResolvedValueOnce([{ id: 1, type: "MACHINE_BREAKDOWN", title: "t", message: "m", machineId: 10, workOrderId: null, readAt: null, createdAt: new Date() }]);
      mockPrisma.notification.count.mockResolvedValueOnce(1);
      const response = await request(app).get("/api/v1/notifications?unreadOnly=true&page=0&size=5")
        .set("Authorization", `Bearer ${await tokenFor("employee")}`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ totalElements: 1, number: 0, size: 5 });
      expect(response.body.content[0]).toHaveProperty("workOrderId", null);
      const call = mockPrisma.notification.findMany.mock.calls[0][0] as unknown as { where: Record<string, unknown> };
      expect(call.where).toEqual({ userId: 2, readAt: null });
    });

    it("returns {count} for unread-count, scoped to the caller", async () => {
      mockPrisma.notification.count.mockResolvedValueOnce(4);
      const response = await request(app).get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${await tokenFor("employee")}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 4 });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({ where: { userId: 2, readAt: null } });
    });

    it("read-all only touches the caller's own unread notifications", async () => {
      const response = await request(app).patch("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${await tokenFor("tech")}`);
      expect(response.status).toBe(204);
      const call = mockPrisma.notification.updateMany.mock.calls[0][0] as unknown as { where: Record<string, unknown> };
      expect(call.where).toEqual({ userId: 4, readAt: null });
    });

    it("marks one notification read only when it belongs to the caller", async () => {
      mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
      const missing = await request(app).patch("/api/v1/notifications/99/read").set("Authorization", `Bearer ${await tokenFor("employee")}`);
      expect(missing.status).toBe(404);
      mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 1 });
      const ok = await request(app).patch("/api/v1/notifications/5/read").set("Authorization", `Bearer ${await tokenFor("employee")}`);
      expect(ok.status).toBe(204);
      const call = mockPrisma.notification.updateMany.mock.calls[1][0] as unknown as { where: Record<string, unknown> };
      expect(call.where).toEqual({ id: 5, userId: 2 });
    });

    it("admin dashboard adds workOrders, employees and six zero-filled months", async () => {
      mockPrisma.user.findMany.mockImplementation(async (_args?: unknown) => [{ ...admin, createdAt: new Date() }]);
      mockPrisma.workOrder.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2).mockResolvedValueOnce(5);
      mockPrisma.workOrder.groupBy.mockResolvedValueOnce([{ priority: "HIGH", _count: { _all: 2 } }]);
      mockPrisma.employee.count.mockResolvedValueOnce(25);
      mockPrisma.employee.groupBy.mockResolvedValueOnce([
        { departmentId: 1, _count: { _all: 20 } }, { departmentId: null, _count: { _all: 5 } },
      ]);
      mockPrisma.department.findMany.mockResolvedValueOnce([{ id: 1, name: "Welding" }, { id: 2, name: "Empty" }] as never);
      const response = await request(app).get("/api/v1/admin/dashboard").set("Authorization", `Bearer ${await tokenFor("admin")}`);
      mockPrisma.user.findMany.mockImplementation(async (_args?: unknown) => [admin]);
      expect(response.status).toBe(200);
      expect(response.body.workOrders).toEqual({
        open: 3, inProgress: 2, doneThisMonth: 5,
        byPriority: [
          { priority: "LOW", count: 0 }, { priority: "MEDIUM", count: 0 },
          { priority: "HIGH", count: 2 }, { priority: "CRITICAL", count: 0 },
        ],
      });
      expect(response.body.employees).toEqual({
        total: 25,
        byDepartment: [{ department: "Welding", count: 20 }, { department: "Unassigned", count: 5 }, { department: "Empty", count: 0 }],
      });
      const months = response.body.users.newUsersPerMonth as Array<{ month: string; count: number }>;
      expect(months).toHaveLength(6);
      expect(months[5].month).toBe(new Date().toISOString().slice(0, 7));
      expect(months[5].count).toBe(1);
      expect(months.slice(0, 5).every((entry) => entry.count === 0)).toBe(true);
      expect(response.body.machines).toHaveProperty("machinesInBreakdown");
    });

    it("keeps the admin dashboard ADMIN-only", async () => {
      const response = await request(app).get("/api/v1/admin/dashboard").set("Authorization", `Bearer ${await tokenFor("hr")}`);
      expect(response.status).toBe(403);
    });

    it("/dashboard/me works for EMPLOYEE without the hr block and includes it for HR_MANAGER", async () => {
      mockPrisma.notification.count.mockResolvedValue(3);
      const employee = await request(app).get("/api/v1/dashboard/me").set("Authorization", `Bearer ${await tokenFor("worker")}`);
      expect(employee.status).toBe(200);
      expect(employee.body).toMatchObject({ myOpenWorkOrders: [], unreadNotifications: 3 });
      expect(employee.body).not.toHaveProperty("hr");
      expect(typeof employee.body.machinesInBreakdown).toBe("number");
      expect(typeof employee.body.overdueMaintenance).toBe("number");
      const call = mockPrisma.workOrder.findMany.mock.calls[0][0] as unknown as { where: { assignedToId: number }; take: number };
      expect(call.where.assignedToId).toBe(7);
      expect(call.take).toBe(5);

      mockPrisma.employee.count.mockResolvedValueOnce(30).mockResolvedValueOnce(4);
      const hr = await request(app).get("/api/v1/dashboard/me").set("Authorization", `Bearer ${await tokenFor("hr")}`);
      expect(hr.status).toBe(200);
      expect(hr.body.hr).toEqual({ employees: 30, onLeave: 4 });
      mockPrisma.notification.count.mockResolvedValue(0);
    });
  });
});
