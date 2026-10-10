import request from "supertest";
import { app } from "../app";
import { admin, machineRow, mockPrisma, tokenFor } from "../test/helpers";

describe("machines", () => {
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
});
