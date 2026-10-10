import request from "supertest";
import { Prisma } from "@prisma/client";
import { app } from "../app";
import { admin, mockPrisma, tokenFor } from "../test/helpers";

describe("HTTP basics and error handling", () => {
  it("reports health", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
  });

  it.each(["http://localhost:4200", "http://127.0.0.1:4200"])("allows frontend origin %s", async (origin) => {
    const response = await request(app).options("/api/v1/auth/login").set("Origin", origin);
    expect(response.headers["access-control-allow-origin"]).toBe(origin);
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
});
