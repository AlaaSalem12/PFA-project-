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
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main(): Promise<void> {
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@metal.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@123";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const demoPasswordHash = await bcrypt.hash("Admin@123", 12);

  const departmentData = [
    ["Administration", "Corporate administration"],
    ["Production", "Steel and aluminum production"],
    ["Maintenance", "Industrial maintenance"],
    ["Welding", "Welding workshop"],
    ["Machining", "CNC and machining workshop"],
  ] as const;
  const departments = new Map<string, number>();
  for (const [name, description] of departmentData) {
    const department = await prisma.department.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    departments.set(name, department.id);
  }

  const positions = new Map<string, number>();
  for (const name of ["HR Manager", "Production Manager", "Maintenance Technician", "Machine Operator"]) {
    const position = await prisma.position.upsert({ where: { name }, update: {}, create: { name } });
    positions.set(name, position.id);
  }

  const adminEmployee = await prisma.employee.upsert({
    where: { matricule: "EMP-0001" },
    update: { departmentId: departments.get("Administration"), positionId: positions.get("HR Manager") },
    create: {
      matricule: "EMP-0001",
      firstName: "System",
      lastName: "Administrator",
      email: adminEmail,
      hireDate: new Date("2020-01-15"),
      status: EmployeeStatus.ACTIVE,
      departmentId: departments.get("Administration"),
      positionId: positions.get("HR Manager"),
    },
  });

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: adminPasswordHash,
      email: adminEmail,
      employeeId: adminEmployee.id,
      mustChangePassword: false,
      enabled: true,
      deletedAt: null,
      lastLoginAt: daysAgo(0),
    },
    create: {
      username: adminUsername,
      passwordHash: adminPasswordHash,
      fullName: "System Administrator",
      email: adminEmail,
      role: Role.ADMIN,
      employeeId: adminEmployee.id,
      mustChangePassword: false,
      lastLoginAt: daysAgo(0),
    },
  });

  const demoUsers = [
    ["production.manager", "Production Manager", "production.manager@metal.local", Role.PRODUCTION_MANAGER, "EMP-0002", "Youssef", "Mansouri", "Production", "Production Manager", 1],
    ["maintenance.tech", "Maintenance Technician", "maintenance.tech@metal.local", Role.MAINTENANCE_TECH, "EMP-0003", "Nadia", "Bennani", "Maintenance", "Maintenance Technician", 3],
    ["employee", "Factory Employee", "employee@metal.local", Role.EMPLOYEE, "EMP-0004", "Karim", "Alaoui", "Machining", "Machine Operator", 7],
    ["sara.quality", "Sara Quality", "sara.quality@metal.local", Role.EMPLOYEE, "EMP-0005", "Sara", "Haddad", "Production", "Machine Operator", 14],
  ] as const;
  const demoUserIds: number[] = [];
  for (const [username, fullName, email, role, matricule, firstName, lastName, department, position, loginDaysAgo] of demoUsers) {
    const employee = await prisma.employee.upsert({
      where: { matricule },
      update: { departmentId: departments.get(department), positionId: positions.get(position) },
      create: {
        matricule,
        firstName,
        lastName,
        email,
        hireDate: new Date("2022-03-01"),
        status: EmployeeStatus.ACTIVE,
        departmentId: departments.get(department),
        positionId: positions.get(position),
      },
    });
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        fullName,
        email,
        role,
        employeeId: employee.id,
        passwordHash: demoPasswordHash,
        enabled: username !== "sara.quality",
        mustChangePassword: false,
        lastLoginAt: daysAgo(loginDaysAgo),
        deletedAt: null,
      },
      create: {
        username,
        fullName,
        email,
        role,
        employeeId: employee.id,
        passwordHash: demoPasswordHash,
        mustChangePassword: false,
        lastLoginAt: daysAgo(loginDaysAgo),
      },
    });
    demoUserIds.push(user.id);
  }

  const machineData = [
    ["CNC-001", "CNC machining center", MachineType.CNC, MaintenanceStatus.OPERATIONAL, "Machining", 12],
    ["LATHE-001", "Heavy duty lathe", MachineType.LATHE, MaintenanceStatus.OPERATIONAL, "Machining", 45],
    ["MILL-001", "Vertical milling machine", MachineType.MILLING, MaintenanceStatus.SCHEDULED_MAINTENANCE, "Machining", -2],
    ["PRESS-001", "Hydraulic press", MachineType.PRESS, MaintenanceStatus.UNDER_MAINTENANCE, "Production", 5],
    ["WELD-001", "Robotic welding station", MachineType.WELDING_STATION, MaintenanceStatus.OPERATIONAL, "Welding", 30],
    ["FURN-001", "Foundry furnace", MachineType.FURNACE, MaintenanceStatus.BREAKDOWN, "Foundry", -10],
    ["CRANE-001", "Workshop overhead crane", MachineType.CRANE, MaintenanceStatus.OPERATIONAL, "Production", 20],
    ["CUT-001", "Plasma cutting table", MachineType.CUTTING, MaintenanceStatus.OUT_OF_SERVICE, "Production", -20],
    ["CNC-002", "Five-axis CNC", MachineType.CNC, MaintenanceStatus.OPERATIONAL, "Machining", 60],
    ["WELD-002", "Manual welding station", MachineType.WELDING_STATION, MaintenanceStatus.OPERATIONAL, "Welding", 15],
  ] as const;
  const machines = new Map<string, { id: number; status: MaintenanceStatus }>();
  for (const [code, name, type, status, location, dueDays] of machineData) {
    const machine = await prisma.machine.upsert({
      where: { code },
      update: {
        name,
        type,
        maintenanceStatus: status,
        location,
        workshop: location,
        nextMaintenanceDueAt: daysFromNow(dueDays),
        createdById: admin.id,
      },
      create: {
        code,
        name,
        type,
        maintenanceStatus: status,
        location,
        workshop: location,
        brand: "MetalWorks",
        model: `MW-${code.split("-")[0]}`,
        hourlyCost: 85,
        operatingHours: 1200,
        nextMaintenanceDueAt: daysFromNow(dueDays),
        createdById: admin.id,
      },
    });
    machines.set(code, { id: machine.id, status });
  }

  // Demo work orders, assigned to the demo maintenance technician (EMP-0003).
  const technician = await prisma.employee.findUnique({ where: { matricule: "EMP-0003" } });
  const workOrderData = [
    ["CNC-001", WorkOrderType.PREVENTIVE, WorkOrderPriority.LOW, WorkOrderStatus.DONE, "Quarterly lubrication and spindle check", 4, 120, "Grease, filters", "Lubrication done, no anomaly"],
    ["MILL-001", WorkOrderType.PREVENTIVE, WorkOrderPriority.MEDIUM, WorkOrderStatus.OPEN, "Replace coolant pump filter", 1, null, null, null],
    ["PRESS-001", WorkOrderType.CORRECTIVE, WorkOrderPriority.HIGH, WorkOrderStatus.IN_PROGRESS, "Hydraulic seal leaking, replace seal kit", 2, null, "Seal kit HX-220", null],
    ["FURN-001", WorkOrderType.CORRECTIVE, WorkOrderPriority.CRITICAL, WorkOrderStatus.OPEN, "Temperature sensor failure, furnace stopped", 0, null, null, null],
    ["WELD-001", WorkOrderType.PREVENTIVE, WorkOrderPriority.LOW, WorkOrderStatus.IN_PROGRESS, "Calibrate welding robot torch", 1, null, null, null],
    ["CRANE-001", WorkOrderType.CORRECTIVE, WorkOrderPriority.MEDIUM, WorkOrderStatus.DONE, "Replace worn hoist cable guide", 9, 340, "Cable guide, bolts", "Guide replaced and load tested"],
  ] as const;
  for (const [code, type, priority, status, description, openedDaysAgo, cost, partsUsed, resolution] of workOrderData) {
    const machine = machines.get(code);
    if (!machine) continue;
    const existing = await prisma.workOrder.findFirst({ where: { machineId: machine.id, description } });
    if (existing) continue;
    await prisma.workOrder.create({
      data: {
        machineId: machine.id, type, priority, status, description,
        assignedToId: technician?.id, createdById: admin.id,
        openedAt: daysAgo(openedDaysAgo),
        closedAt: status === WorkOrderStatus.DONE ? daysAgo(Math.max(openedDaysAgo - 1, 0)) : null,
        cost, partsUsed, resolution,
      },
    });
  }

  const statusEvents = [
    ["CNC-001", MaintenanceStatus.SCHEDULED_MAINTENANCE, MaintenanceStatus.OPERATIONAL, "Routine maintenance completed", 3],
    ["MILL-001", MaintenanceStatus.OPERATIONAL, MaintenanceStatus.SCHEDULED_MAINTENANCE, "Preventive maintenance scheduled", 2],
    ["PRESS-001", MaintenanceStatus.SCHEDULED_MAINTENANCE, MaintenanceStatus.UNDER_MAINTENANCE, "Hydraulic seal replacement in progress", 1],
    ["FURN-001", MaintenanceStatus.OPERATIONAL, MaintenanceStatus.BREAKDOWN, "Temperature sensor failure detected", 0],
    ["CUT-001", MaintenanceStatus.BREAKDOWN, MaintenanceStatus.OUT_OF_SERVICE, "Safety guard damaged; machine isolated", 4],
  ] as const;
  for (const [code, fromStatus, toStatus, comment, age] of statusEvents) {
    const machine = machines.get(code);
    if (!machine) continue;
    const existing = await prisma.machineStatusLog.findFirst({ where: { machineId: machine.id, comment } });
    if (!existing) {
      await prisma.machineStatusLog.create({
        data: { machineId: machine.id, fromStatus, toStatus, comment, changedById: admin.id, changedAt: daysAgo(age) },
      });
    }
  }

  const notificationData = [
    [NotificationType.MACHINE_BREAKDOWN, "Machine breakdown", "FURN-001 - Foundry furnace requires immediate attention.", "FURN-001"],
    [NotificationType.MACHINE_OUT_OF_SERVICE, "Machine out of service", "CUT-001 - Plasma cutting table has been isolated.", "CUT-001"],
  ] as const;
  for (const userId of [admin.id, ...demoUserIds.slice(0, 1)]) {
    for (const [type, title, message, code] of notificationData) {
      const machine = machines.get(code);
      if (!machine) continue;
      const existing = await prisma.notification.findFirst({ where: { userId, machineId: machine.id, type } });
      if (!existing) {
        await prisma.notification.create({ data: { userId, type, title, message, machineId: machine.id } });
      }
    }
  }

  const auditData = [
    ["CREATE", "User", String(admin.id), "Seeded administrator account"],
    ["CREATE", "User", String(demoUserIds[0]), "Created production manager"],
    ["CREATE", "Machine", String(machines.get("CNC-001")?.id), "Added CNC machining center"],
    ["STATUS_CHANGE", "Machine", String(machines.get("FURN-001")?.id), "Machine changed to breakdown"],
    ["STATUS_CHANGE", "Machine", String(machines.get("CUT-001")?.id), "Machine changed to out of service"],
  ] as const;
  for (const [action, entity, entityId, description] of auditData) {
    const existing = await prisma.auditLog.findFirst({ where: { action, entity, entityId, metadata: { path: ["seedDescription"], equals: description } } });
    if (!existing) {
      await prisma.auditLog.create({ data: { userId: admin.id, action, entity, entityId, metadata: { seedDescription: description }, ip: "127.0.0.1" } });
    }
  }

  console.log(`Demo data ready: ${adminUsername} plus ${demoUsers.length} users and ${machineData.length} machines.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
