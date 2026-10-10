import request from "supertest";
import { app } from "../app";
import { admin, mockPrisma } from "../test/helpers";

describe("auth", () => {
  let adminToken: string;

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
});
