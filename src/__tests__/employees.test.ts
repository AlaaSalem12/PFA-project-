import request from "supertest";
import { app } from "../app";
import { admin, mockPrisma, tokenFor } from "../test/helpers";

describe("employees and organization", () => {
  it("returns the employee pagination contract", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ username: "admin", password: "Admin@123" });
    const response = await request(app).get("/api/v1/employees?page=0&size=10&sort=id,desc&search=")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
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
});
