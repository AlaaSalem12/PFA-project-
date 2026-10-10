import request from "supertest";
import { Prisma } from "@prisma/client";
import { app } from "../app";
import { mailService } from "../modules/mail/mail.service";
import { admin, employeeUser, mockPrisma, tokenFor } from "../test/helpers";

describe("users", () => {
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

  it("creates HR managers and writes an audit entry", async () => {
    const token = await tokenFor("admin");
    const created = await request(app).post("/api/v1/users").set("Authorization", `Bearer ${token}`)
      .send({ username: "hr.new", fullName: "HR New", email: "hr.new@metal.local", role: "HR_MANAGER" });
    expect(created.status).toBe(201);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "USER_CREATED", entity: "User", userId: 1 }),
    }));
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
});
