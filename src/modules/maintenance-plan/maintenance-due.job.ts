import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

const DAY_MS = 24 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Creates MAINTENANCE_DUE notifications for ADMIN and PRODUCTION_MANAGER users:
 * - machines with a plan due within one day (or already overdue)
 * - machines whose nextMaintenanceDueAt is in the past
 * At most one notification per user and machine per calendar day. Returns how many were created.
 */
export const runMaintenanceDueCheck = async (now: Date = new Date()): Promise<number> => {
  const recipients = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "PRODUCTION_MANAGER"] }, enabled: true, deletedAt: null },
    select: { id: true },
  });
  if (recipients.length === 0) return 0;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const targets = new Map<number, { title: string; message: string }>();
  const duePlans = await prisma.maintenancePlan.findMany({
    where: { nextDueDate: { lte: new Date(now.getTime() + DAY_MS) }, machine: { deletedAt: null } },
    include: { machine: { select: { id: true, code: true, name: true } } },
    orderBy: { nextDueDate: "asc" },
  });
  for (const plan of duePlans) {
    if (targets.has(plan.machine.id)) continue;
    targets.set(plan.machine.id, {
      title: `Maintenance due: ${plan.machine.code}`,
      message: `${plan.machine.code} - ${plan.machine.name}: ${plan.task} (due ${isoDay(plan.nextDueDate)})`,
    });
  }
  const overdueMachines = await prisma.machine.findMany({
    where: { deletedAt: null, nextMaintenanceDueAt: { lt: now } },
    select: { id: true, code: true, name: true, nextMaintenanceDueAt: true },
  });
  for (const machine of overdueMachines) {
    if (targets.has(machine.id)) continue;
    targets.set(machine.id, {
      title: `Maintenance overdue: ${machine.code}`,
      message: `${machine.code} - ${machine.name}: maintenance overdue since ${isoDay(machine.nextMaintenanceDueAt!)}`,
    });
  }

  let created = 0;
  for (const [machineId, content] of targets) {
    const already = await prisma.notification.findMany({
      where: { type: "MAINTENANCE_DUE", machineId, createdAt: { gte: startOfDay } },
      select: { userId: true },
    });
    const notified = new Set(already.map((notification) => notification.userId));
    const data = recipients
      .filter((recipient) => !notified.has(recipient.id))
      .map((recipient) => ({ userId: recipient.id, type: "MAINTENANCE_DUE" as const, machineId, ...content }));
    if (data.length > 0) {
      await prisma.notification.createMany({ data });
      created += data.length;
    }
  }
  return created;
};

/** Runs once at boot and every 6 hours; disabled under test. */
export const startMaintenanceDueJob = (): NodeJS.Timeout | undefined => {
  if (env.NODE_ENV === "test") return undefined;
  const run = () => {
    runMaintenanceDueCheck().catch((error) => console.error("[maintenance-due] check failed", error));
  };
  run();
  const timer = setInterval(run, SIX_HOURS_MS);
  timer.unref();
  return timer;
};
