import { assistantRegistry, capRows, MAX_ROWS } from "../modules/assistant/tools/registry";
import { mockPrisma } from "../test/helpers";

const as = (role: string, id = 1, employeeId: number | null = null) =>
  ({ id, username: role.toLowerCase(), role, employeeId, tokenVersion: 0, mustChangePassword: false }) as never;
const names = (role: string) => assistantRegistry.forUser(as(role)).map((tool) => tool.type === "function" ? tool.function.name : "");

describe("assistant tools (P2-02)", () => {
  it("only offers each role the tools it may use", () => {
    const employee = names("EMPLOYEE");
    expect(employee).not.toEqual(expect.arrayContaining(["search_employees"]));
    for (const forbidden of ["search_employees", "get_hr_summary", "get_user_stats", "get_maintenance_plans_due"]) {
      expect(employee).not.toContain(forbidden);
    }
    expect(employee).toEqual(expect.arrayContaining(["search_machines", "list_work_orders", "get_my_profile"]));
    expect(names("HR_MANAGER")).toEqual(expect.arrayContaining(["search_employees", "get_hr_summary"]));
    expect(names("HR_MANAGER")).not.toContain("get_user_stats");
    expect(names("ADMIN")).toHaveLength(11);
  });

  it("re-checks the role when running a tool the role was never offered", async () => {
    expect(await assistantRegistry.run(as("EMPLOYEE"), "search_employees", { query: "a" })).toEqual({ error: "not allowed" });
    expect(await assistantRegistry.run(as("PRODUCTION_MANAGER"), "get_user_stats", {})).toEqual({ error: "not allowed" });
    expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
  });

  it("validates arguments and reports unknown tools without throwing", async () => {
    const bad = await assistantRegistry.run(as("ADMIN"), "get_machine_history", { code: "CNC-001", limit: 99 }) as { error: string };
    expect(bad.error).toMatch(/limit/);
    const wrongEnum = await assistantRegistry.run(as("ADMIN"), "search_machines", { status: "BROKEN" }) as { error: string };
    expect(wrongEnum.error).toMatch(/status/);
    expect(await assistantRegistry.run(as("ADMIN"), "drop_tables", {})).toEqual({ error: "unknown tool: drop_tables" });
  });

  it("never exposes SSN, address, birth date or phone from search_employees", async () => {
    mockPrisma.employee.count.mockResolvedValueOnce(1);
    mockPrisma.employee.findMany.mockResolvedValueOnce([{
      matricule: "EMP-0009", firstName: "Omar", lastName: "Tazi", status: "ACTIVE", hireDate: new Date("2020-01-01"),
      department: { name: "Welding" }, position: { name: "Welder" },
      socialSecurityNumber: "123-45", address: "1 rue X", birthDate: new Date("1990-01-01"), phone: "+212600000000",
    }] as never);
    const result = await assistantRegistry.run(as("HR_MANAGER"), "search_employees", { department: "Welding" }) as { employees: object[] };
    const keys = Object.keys(result.employees[0]);
    for (const secret of ["socialSecurityNumber", "address", "birthDate", "phone", "email"]) expect(keys).not.toContain(secret);
    expect(result.employees[0]).toMatchObject({ matricule: "EMP-0009", fullName: "Omar Tazi", department: "Welding" });
    const query = mockPrisma.employee.findMany.mock.calls[0][0] as unknown as { select: Record<string, unknown> };
    for (const secret of ["socialSecurityNumber", "address", "birthDate", "phone", "email"]) expect(query.select).not.toHaveProperty(secret);
  });

  it("forces list_work_orders to the employee's own orders even with mine:false", async () => {
    await assistantRegistry.run(as("EMPLOYEE", 8, 7), "list_work_orders", { mine: false });
    const query = mockPrisma.workOrder.findMany.mock.calls[0][0] as unknown as { where: { assignedToId: number } };
    expect(query.where.assignedToId).toBe(7);
  });

  it("caps result arrays at 20 rows and flags the truncation", async () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      code: `M-${index}`, name: "m", type: "CNC", maintenanceStatus: "OPERATIONAL", location: "X", nextMaintenanceDueAt: null,
      hourlyCost: null, operatingHours: 0,
    }));
    mockPrisma.machine.findMany.mockResolvedValueOnce(rows as never);
    mockPrisma.machine.count.mockResolvedValueOnce(30);
    const result = await assistantRegistry.run(as("EMPLOYEE"), "search_machines", {}) as { total: number; machines: object[]; truncated: boolean };
    expect(result.total).toBe(30);
    expect(result.machines).toHaveLength(MAX_ROWS);
    expect(result.truncated).toBe(true);
    expect(capRows(Array.from({ length: 25 }, (_, index) => index))).toEqual({ items: Array.from({ length: 20 }, (_, index) => index), truncated: true });
    expect(capRows({ list: [1, 2] })).toEqual({ list: [1, 2] });
  });

  it("turns handler crashes into {error: 'tool failed'}", async () => {
    mockPrisma.machine.count.mockRejectedValueOnce(new Error("db down"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await assistantRegistry.run(as("ADMIN"), "get_fleet_summary", {})).toEqual({ error: "tool failed" });
    spy.mockRestore();
  });

  it("sends clean JSON schemas (no $schema) to the model", () => {
    const tools = assistantRegistry.forUser(as("ADMIN"));
    for (const tool of tools) {
      if (tool.type !== "function") continue;
      expect(tool.function.parameters).not.toHaveProperty("$schema");
      expect(tool.function.parameters).toMatchObject({ type: "object" });
      expect(tool.function.description?.length).toBeGreaterThan(40);
    }
  });
});
