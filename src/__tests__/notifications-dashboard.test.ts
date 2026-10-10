import request from "supertest";
import { app } from "../app";
import { admin, mockPrisma, tokenFor } from "../test/helpers";

describe("notifications and dashboards", () => {
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
