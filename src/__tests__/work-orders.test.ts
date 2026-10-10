import request from "supertest";
import { app } from "../app";
import { admin, machineRow, mockPrisma, tokenFor } from "../test/helpers";

describe("work orders", () => {
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
});
