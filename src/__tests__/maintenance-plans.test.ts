import request from "supertest";
import { app } from "../app";
import { runMaintenanceDueCheck } from "../modules/maintenance-plan/maintenance-due.job";
import { admin, machineRow, mockPrisma, tokenFor } from "../test/helpers";

describe("maintenance plans", () => {
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
});
