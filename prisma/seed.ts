import "dotenv/config";
import bcrypt from "bcrypt";
import {
  EmployeeStatus,
  MachineType,
  MaintenanceStatus,
  NotificationType,
  PrismaClient,
  Role,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderType,
} from "@prisma/client";

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS);

const DEMO_PASSWORD = "Demo@1234";

/** Demo accounts. The admin password is only set on creation; the others are reset on every run. */
const demoAccounts = [
  { username: "admin", fullName: "System Administrator", role: Role.ADMIN, matricule: "EMP-0001", lastLoginDaysAgo: 0 },
  { username: "hr", fullName: "Lina Haddad", role: Role.HR_MANAGER, matricule: "EMP-0006", lastLoginDaysAgo: 2 },
  { username: "prod", fullName: "Youssef Mansouri", role: Role.PRODUCTION_MANAGER, matricule: "EMP-0002", lastLoginDaysAgo: 1 },
  { username: "tech", fullName: "Nadia Bennani", role: Role.MAINTENANCE_TECH, matricule: "EMP-0003", lastLoginDaysAgo: 3 },
  { username: "employee", fullName: "Karim Alaoui", role: Role.EMPLOYEE, matricule: "EMP-0004", lastLoginDaysAgo: 7 },
] as const;

const departmentData = [
  ["Administration", "Corporate administration"],
  ["Production", "Steel and aluminum production"],
  ["Maintenance", "Industrial maintenance"],
  ["Welding", "Welding workshop"],
  ["Machining", "CNC and machining workshop"],
] as const;

const positionNames = [
  "HR Manager", "Production Manager", "Maintenance Technician", "Machine Operator",
  "Welder", "CNC Operator", "Quality Inspector", "Logistics Clerk",
];

// Named staff behind the demo accounts: [matricule, first, last, department, position]
const keyStaff = [
  ["EMP-0001", "System", "Administrator", "Administration", "HR Manager"],
  ["EMP-0002", "Youssef", "Mansouri", "Production", "Production Manager"],
  ["EMP-0003", "Nadia", "Bennani", "Maintenance", "Maintenance Technician"],
  ["EMP-0004", "Karim", "Alaoui", "Machining", "CNC Operator"],
  ["EMP-0005", "Sara", "Haddad", "Production", "Machine Operator"],
  ["EMP-0006", "Lina", "Haddad", "Administration", "HR Manager"],
] as const;

const firstNames = ["Amine", "Salma", "Omar", "Imane", "Hamza", "Khadija", "Mehdi", "Zineb", "Reda", "Hind", "Anas", "Meryem",
  "Yassine", "Sofia", "Tarik", "Nora", "Ilyas", "Rania", "Bilal", "Ghita", "Adil", "Lamia", "Soufiane", "Hajar"];
const lastNames = ["El Idrissi", "Berrada", "Tazi", "Chraibi", "Fassi", "Benjelloun", "Lahlou", "Ouazzani", "Skalli", "Bennis", "Amrani",
  "Kettani", "Sebti", "Alami", "Cherkaoui", "Zniber", "Guessous", "Hajji", "Mekouar", "Naciri", "Sqalli", "Tahiri", "Slaoui", "Daoudi"];
const staffPlan = [
  ["Production", "Machine Operator"], ["Welding", "Welder"], ["Machining", "CNC Operator"],
  ["Maintenance", "Maintenance Technician"], ["Production", "Quality Inspector"], ["Administration", "Logistics Clerk"],
] as const;

const machineData = [
  // code, name, type, status, location, next due in (days), interval (days)
  ["CNC-001", "CNC machining center", MachineType.CNC, MaintenanceStatus.OPERATIONAL, "Machining", 12, 90],
  ["LATHE-001", "Heavy duty lathe", MachineType.LATHE, MaintenanceStatus.OPERATIONAL, "Machining", 45, 120],
  ["MILL-001", "Vertical milling machine", MachineType.MILLING, MaintenanceStatus.SCHEDULED_MAINTENANCE, "Machining", -2, 60],
  ["PRESS-001", "Hydraulic press", MachineType.PRESS, MaintenanceStatus.UNDER_MAINTENANCE, "Production", 5, 180],
  ["WELD-001", "Robotic welding station", MachineType.WELDING_STATION, MaintenanceStatus.OPERATIONAL, "Welding", 30, 60],
  ["FURN-001", "Foundry furnace", MachineType.FURNACE, MaintenanceStatus.BREAKDOWN, "Foundry", -10, 90],
  ["CRANE-001", "Workshop overhead crane", MachineType.CRANE, MaintenanceStatus.OPERATIONAL, "Production", 20, 180],
  ["CUT-001", "Plasma cutting table", MachineType.CUTTING, MaintenanceStatus.OUT_OF_SERVICE, "Production", -20, 90],
  ["CNC-002", "Five-axis CNC", MachineType.CNC, MaintenanceStatus.OPERATIONAL, "Machining", 60, 90],
  ["WELD-002", "Manual welding station", MachineType.WELDING_STATION, MaintenanceStatus.OPERATIONAL, "Welding", 15, 60],
  ["LATHE-002", "CNC turning center", MachineType.LATHE, MaintenanceStatus.OPERATIONAL, "Machining", 38, 120],
  ["MILL-002", "Horizontal milling machine", MachineType.MILLING, MaintenanceStatus.OPERATIONAL, "Machining", 25, 90],
  ["PRESS-002", "Stamping press 200 t", MachineType.PRESS, MaintenanceStatus.OPERATIONAL, "Production", 70, 180],
  ["FURN-002", "Heat treatment furnace", MachineType.FURNACE, MaintenanceStatus.OPERATIONAL, "Foundry", 9, 90],
  ["CRANE-002", "Gantry crane 10 t", MachineType.CRANE, MaintenanceStatus.SCHEDULED_MAINTENANCE, "Production", 3, 180],
  ["CUT-002", "Laser cutting machine", MachineType.CUTTING, MaintenanceStatus.OPERATIONAL, "Production", 50, 90],
] as const;

async function renameLegacyDemoUsers(): Promise<void> {
  // Earlier seeds created these usernames; renaming keeps their employee link and avoids duplicates.
  const legacy = [
    ["production.manager", "prod", "prod@metal.local"],
    ["maintenance.tech", "tech", "tech@metal.local"],
  ] as const;
  for (const [from, to, email] of legacy) {
    const target = await prisma.user.findUnique({ where: { username: to } });
    if (!target) await prisma.user.updateMany({ where: { username: from }, data: { username: to, email } });
  }
}

async function main(): Promise<void> {
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || DEMO_PASSWORD;

  // Departments and positions
  const departments = new Map<string, number>();
  for (const [name, description] of departmentData) {
    const department = await prisma.department.upsert({ where: { name }, update: { description }, create: { name, description } });
    departments.set(name, department.id);
  }
  const positions = new Map<string, number>();
  for (const name of positionNames) {
    const position = await prisma.position.upsert({ where: { name }, update: {}, create: { name } });
    positions.set(name, position.id);
  }

  // Employees: key staff first, then generated staff to fill every department.
  const upsertEmployee = async (
    matricule: string, firstName: string, lastName: string, department: string, position: string,
    extra: { status?: EmployeeStatus; hireDate?: Date; phone?: string; email?: string } = {},
  ) => prisma.employee.upsert({
    where: { matricule },
    update: { departmentId: departments.get(department), positionId: positions.get(position) },
    create: {
      matricule, firstName, lastName,
      email: extra.email ?? `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, "") + "@metal.local",
      phone: extra.phone,
      hireDate: extra.hireDate ?? new Date("2022-03-01"),
      status: extra.status ?? EmployeeStatus.ACTIVE,
      departmentId: departments.get(department),
      positionId: positions.get(position),
    },
  });
  const employees = new Map<string, number>();
  for (const [matricule, first, last, department, position] of keyStaff) {
    employees.set(matricule, (await upsertEmployee(matricule, first, last, department, position, { hireDate: new Date("2020-01-15") })).id);
  }
  for (let index = 0; index < firstNames.length; index += 1) {
    const matricule = `EMP-${String(index + 7).padStart(4, "0")}`;
    const [department, position] = staffPlan[index % staffPlan.length];
    const status = index % 11 === 0 ? EmployeeStatus.ON_LEAVE : index === 5 ? EmployeeStatus.SUSPENDED : EmployeeStatus.ACTIVE;
    const employee = await upsertEmployee(matricule, firstNames[index], lastNames[index], department, position, {
      status,
      hireDate: new Date(Date.UTC(2018 + (index % 6), index % 12, 1 + (index % 27))),
      phone: `+2126${String(10000000 + index * 7311).slice(0, 8)}`,
    });
    employees.set(matricule, employee.id);
  }

  // Users (one per role). The existing admin keeps its password; demo users are reset to the documented one.
  await renameLegacyDemoUsers();
  const adminExisted = Boolean(await prisma.user.findUnique({ where: { username: "admin" } }));
  const userIds = new Map<string, number>();
  for (const account of demoAccounts) {
    const isAdmin = account.role === Role.ADMIN;
    const email = isAdmin ? (process.env.SEED_ADMIN_EMAIL || "admin@metal.local") : `${account.username}@metal.local`;
    const employeeId = employees.get(account.matricule);
    const common = {
      fullName: account.fullName, email, role: account.role, employeeId,
      enabled: true, deletedAt: null, mustChangePassword: false, lockedUntil: null, failedLoginAttempts: 0,
      lastLoginAt: daysAgo(account.lastLoginDaysAgo),
    };
    const user = await prisma.user.upsert({
      where: { username: account.username },
      update: isAdmin ? common : { ...common, passwordHash: demoHash },
      create: {
        username: account.username, ...common,
        passwordHash: isAdmin ? await bcrypt.hash(adminPassword, 12) : demoHash,
      },
    });
    userIds.set(account.username, user.id);
  }
  const adminId = userIds.get("admin")!;
  const prodId = userIds.get("prod")!;
  const techId = userIds.get("tech")!;

  // Machines
  const machines = new Map<string, { id: number; status: MaintenanceStatus }>();
  for (const [code, name, type, status, location, dueDays, intervalDays] of machineData) {
    const machine = await prisma.machine.upsert({
      where: { code },
      // Status is only seeded on creation so re-running the seed never undoes real status changes.
      update: { name, type, location, workshop: location, maintenanceIntervalDays: intervalDays, nextMaintenanceDueAt: daysFromNow(dueDays) },
      create: {
        code, name, type, maintenanceStatus: status, location, workshop: location,
        brand: "MetalWorks", model: `MW-${code.split("-")[0]}`, serialNumber: `SN-${code}`,
        hourlyCost: 85 + (code.length * 7) % 40, operatingHours: 1200 + (code.length * 311) % 4000,
        purchaseDate: new Date("2019-06-01"), maintenanceIntervalDays: intervalDays,
        lastMaintenanceAt: daysAgo(Math.max(intervalDays - dueDays, 1)),
        nextMaintenanceDueAt: daysFromNow(dueDays), createdById: adminId,
      },
    });
    machines.set(code, { id: machine.id, status: machine.maintenanceStatus });
  }
  // Authorized operators for the main production machines
  const operatorPlan: Array<[string, string[]]> = [
    ["CNC-001", ["EMP-0004", "EMP-0009", "EMP-0015"]],
    ["CNC-002", ["EMP-0004", "EMP-0021"]],
    ["WELD-001", ["EMP-0008", "EMP-0014"]],
    ["WELD-002", ["EMP-0008", "EMP-0020"]],
    ["PRESS-001", ["EMP-0005", "EMP-0007"]],
    ["LATHE-001", ["EMP-0009", "EMP-0015"]],
  ];
  for (const [code, matricules] of operatorPlan) {
    const machine = machines.get(code);
    if (!machine) continue;
    const ids = matricules.map((matricule) => employees.get(matricule)).filter((id): id is number => id !== undefined);
    await prisma.machine.update({ where: { id: machine.id }, data: { authorizedOperators: { set: ids.map((id) => ({ id })) } } });
  }

  // Work orders for the demo technician
  const technicianEmployeeId = employees.get("EMP-0003");
  const workOrderData = [
    ["CNC-001", WorkOrderType.PREVENTIVE, WorkOrderPriority.LOW, WorkOrderStatus.DONE, "Quarterly lubrication and spindle check", 4, 120, "Grease, filters", "Lubrication done, no anomaly"],
    ["MILL-001", WorkOrderType.PREVENTIVE, WorkOrderPriority.MEDIUM, WorkOrderStatus.OPEN, "Replace coolant pump filter", 1, null, null, null],
    ["PRESS-001", WorkOrderType.CORRECTIVE, WorkOrderPriority.HIGH, WorkOrderStatus.IN_PROGRESS, "Hydraulic seal leaking, replace seal kit", 2, null, "Seal kit HX-220", null],
    ["FURN-001", WorkOrderType.CORRECTIVE, WorkOrderPriority.CRITICAL, WorkOrderStatus.OPEN, "Temperature sensor failure, furnace stopped", 0, null, null, null],
    ["WELD-001", WorkOrderType.PREVENTIVE, WorkOrderPriority.LOW, WorkOrderStatus.IN_PROGRESS, "Calibrate welding robot torch", 1, null, null, null],
    ["CRANE-001", WorkOrderType.CORRECTIVE, WorkOrderPriority.MEDIUM, WorkOrderStatus.DONE, "Replace worn hoist cable guide", 9, 340, "Cable guide, bolts", "Guide replaced and load tested"],
  ] as const;
  const workOrderIds = new Map<string, number>();
  for (const [code, type, priority, status, description, openedDaysAgo, cost, partsUsed, resolution] of workOrderData) {
    const machine = machines.get(code);
    if (!machine) continue;
    const existing = await prisma.workOrder.findFirst({ where: { machineId: machine.id, description } });
    const order = existing ?? await prisma.workOrder.create({
      data: {
        machineId: machine.id, type, priority, status, description,
        assignedToId: technicianEmployeeId, createdById: prodId,
        openedAt: daysAgo(openedDaysAgo),
        closedAt: status === WorkOrderStatus.DONE ? daysAgo(Math.max(openedDaysAgo - 1, 0)) : null,
        cost, partsUsed, resolution,
      },
    });
    workOrderIds.set(code, order.id);
  }

  // Maintenance plans (one is overdue so the dashboards have something to flag)
  const planData = [
    ["CNC-001", "Spindle lubrication and coolant check", 30, 12],
    ["LATHE-001", "Bed alignment and chuck inspection", 90, 45],
    ["WELD-001", "Torch, liner and wire feeder service", 30, 5],
    ["MILL-001", "Coolant system flush and filter change", 60, -2],
  ] as const;
  for (const [code, task, frequencyDays, dueInDays] of planData) {
    const machine = machines.get(code);
    if (!machine) continue;
    if (!(await prisma.maintenancePlan.findFirst({ where: { machineId: machine.id, task } }))) {
      await prisma.maintenancePlan.create({
        data: { machineId: machine.id, task, frequencyDays, nextDueDate: daysFromNow(dueInDays), createdById: adminId },
      });
    }
  }

  // Status history
  const statusEvents = [
    ["CNC-001", MaintenanceStatus.SCHEDULED_MAINTENANCE, MaintenanceStatus.OPERATIONAL, "Routine maintenance completed", 3],
    ["MILL-001", MaintenanceStatus.OPERATIONAL, MaintenanceStatus.SCHEDULED_MAINTENANCE, "Preventive maintenance scheduled", 2],
    ["PRESS-001", MaintenanceStatus.SCHEDULED_MAINTENANCE, MaintenanceStatus.UNDER_MAINTENANCE, "Hydraulic seal replacement in progress", 1],
    ["FURN-001", MaintenanceStatus.OPERATIONAL, MaintenanceStatus.BREAKDOWN, "Temperature sensor failure detected", 0],
    ["CUT-001", MaintenanceStatus.BREAKDOWN, MaintenanceStatus.OUT_OF_SERVICE, "Safety guard damaged; machine isolated", 4],
    ["CRANE-002", MaintenanceStatus.OPERATIONAL, MaintenanceStatus.SCHEDULED_MAINTENANCE, "Annual inspection booked", 1],
  ] as const;
  for (const [code, fromStatus, toStatus, comment, age] of statusEvents) {
    const machine = machines.get(code);
    if (!machine) continue;
    if (!(await prisma.machineStatusLog.findFirst({ where: { machineId: machine.id, comment } }))) {
      await prisma.machineStatusLog.create({
        data: { machineId: machine.id, fromStatus, toStatus, comment, changedById: techId, changedAt: daysAgo(age) },
      });
    }
  }

  // Notifications
  const furnace = machines.get("FURN-001");
  const cutter = machines.get("CUT-001");
  const notifications: Array<{ userId: number; type: NotificationType; title: string; message: string; machineId?: number; workOrderId?: number; read?: boolean }> = [];
  for (const userId of [adminId, prodId]) {
    if (furnace) notifications.push({ userId, type: NotificationType.MACHINE_BREAKDOWN, title: "Machine breakdown", message: "FURN-001 - Foundry furnace requires immediate attention.", machineId: furnace.id });
    if (cutter) notifications.push({ userId, type: NotificationType.MACHINE_OUT_OF_SERVICE, title: "Machine out of service", message: "CUT-001 - Plasma cutting table has been isolated.", machineId: cutter.id, read: true });
  }
  const furnaceOrder = workOrderIds.get("FURN-001");
  if (furnace && furnaceOrder) {
    notifications.push({
      userId: techId, type: NotificationType.WORK_ORDER_ASSIGNED, title: `New work order #${furnaceOrder}`,
      message: "FURN-001 – CRITICAL – Temperature sensor failure, furnace stopped", machineId: furnace.id, workOrderId: furnaceOrder,
    });
  }
  const overdueMill = machines.get("MILL-001");
  if (overdueMill) {
    notifications.push({ userId: adminId, type: NotificationType.MAINTENANCE_DUE, title: "Maintenance overdue: MILL-001", message: "MILL-001 - Vertical milling machine: maintenance overdue", machineId: overdueMill.id });
  }
  for (const { read, ...notification } of notifications) {
    const existing = await prisma.notification.findFirst({
      where: { userId: notification.userId, type: notification.type, machineId: notification.machineId ?? null },
    });
    if (!existing) await prisma.notification.create({ data: { ...notification, readAt: read ? daysAgo(1) : null } });
  }

  // Audit samples using the contract action names
  const auditData: Array<[string, string, string | number | undefined, string]> = [
    ["USER_CREATED", "User", userIds.get("hr"), "Created HR manager account"],
    ["USER_CREATED", "User", prodId, "Created production manager account"],
    ["MACHINE_CREATED", "Machine", machines.get("CNC-001")?.id, "Added CNC machining center"],
    ["MACHINE_STATUS_CHANGED", "Machine", furnace?.id, "Machine changed to breakdown"],
    ["MACHINE_STATUS_CHANGED", "Machine", cutter?.id, "Machine changed to out of service"],
  ];
  for (const [action, entity, entityId, description] of auditData) {
    if (entityId === undefined) continue;
    const id = String(entityId);
    if (!(await prisma.auditLog.findFirst({ where: { action, entity, entityId: id, metadata: { path: ["seedDescription"], equals: description } } }))) {
      await prisma.auditLog.create({ data: { userId: adminId, action, entity, entityId: id, metadata: { seedDescription: description }, ip: "127.0.0.1" } });
    }
  }

  console.log(`\nDemo data ready: ${employees.size} employees, ${machines.size} machines, ${workOrderData.length} work orders.\n`);
  console.log("Demo accounts");
  console.log("-------------------------------------------------------------");
  console.log("username   | role                | password");
  for (const account of demoAccounts) {
    const isAdmin = account.role === Role.ADMIN;
    const password = !isAdmin ? DEMO_PASSWORD : adminExisted ? "(unchanged, existing account)" : adminPassword;
    console.log(`${account.username.padEnd(10)} | ${account.role.padEnd(19)} | ${password}`);
  }
  console.log("-------------------------------------------------------------\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
