import { MaintenanceStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../common/api-error";
import { pageResponse } from "../../common/pagination";
import { toMachineDto, toMachineDtos } from "./machine.dto";
import { removeMachineImage, saveMachineImage } from "./machine-image";
import { toWorkOrderDto, workOrderInclude } from "../work-order/work-order.dto";

const operatorSelect = { id: true, matricule: true, firstName: true, lastName: true } as const;

const transitions: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  OPERATIONAL: ["SCHEDULED_MAINTENANCE", "UNDER_MAINTENANCE", "BREAKDOWN", "OUT_OF_SERVICE"],
  SCHEDULED_MAINTENANCE: ["UNDER_MAINTENANCE", "OPERATIONAL"],
  UNDER_MAINTENANCE: ["OPERATIONAL", "BREAKDOWN"],
  BREAKDOWN: ["UNDER_MAINTENANCE", "OPERATIONAL", "OUT_OF_SERVICE"],
  OUT_OF_SERVICE: ["UNDER_MAINTENANCE", "OPERATIONAL"], // restoring requires ADMIN, enforced in changeStatus
};

export class MachineService {
  async list(query: {
    page: number; size: number; search: string; sort: string;
    status?: MaintenanceStatus; type?: string; location?: string;
  }) {
    const [field, direction] = query.sort.split(",");
    const sortField = ["code", "name", "type", "maintenanceStatus", "location", "id"].includes(field) ? field : "id";
    const orderBy: Prisma.MachineOrderByWithRelationInput = {
      [sortField]: direction as Prisma.SortOrder,
    };
    const where: Prisma.MachineWhereInput = {
      deletedAt: null,
      ...(query.status ? { maintenanceStatus: query.status } : {}),
      ...(query.type ? { type: query.type as never } : {}),
      ...(query.location ? { location: { contains: query.location, mode: "insensitive" } } : {}),
      ...(query.search ? {
        OR: [
          { code: { contains: query.search, mode: "insensitive" } },
          { name: { contains: query.search, mode: "insensitive" } },
          { serialNumber: { contains: query.search, mode: "insensitive" } },
        ],
      } : {}),
    };
    const [content, totalElements] = await prisma.$transaction([
      prisma.machine.findMany({ where, orderBy, skip: query.page * query.size, take: query.size }),
      prisma.machine.count({ where }),
    ]);
    return pageResponse(toMachineDtos(content), totalElements, query.page, query.size);
  }

  /** Raw row (Decimals untouched) for internal checks. */
  private async find(id: number) {
    const machine = await prisma.machine.findFirst({ where: { id, deletedAt: null } });
    if (!machine) throw new ApiError(404, "Machine not found");
    return machine;
  }

  async get(id: number) {
    const machine = await prisma.machine.findFirst({
      where: { id, deletedAt: null },
      include: { authorizedOperators: { select: operatorSelect, orderBy: { lastName: "asc" } } },
    });
    if (!machine) throw new ApiError(404, "Machine not found");
    return toMachineDto(machine);
  }

  async create(input: Prisma.MachineCreateInput, actorId: number) {
    return toMachineDto(await prisma.machine.create({ data: { ...input, createdBy: { connect: { id: actorId } } } }));
  }

  async update(id: number, input: Prisma.MachineUpdateInput) {
    await this.find(id);
    return toMachineDto(await prisma.machine.update({ where: { id }, data: input }));
  }

  async setImage(id: number, file: Buffer) {
    const current = await this.find(id);
    const imageUrl = saveMachineImage(id, file);
    const machine = await prisma.machine.update({ where: { id }, data: { imageUrl } });
    removeMachineImage(current.imageUrl);
    return toMachineDto(machine);
  }

  async setOperators(id: number, employeeIds: number[]) {
    await this.find(id);
    const ids = [...new Set(employeeIds)];
    const found = await prisma.employee.count({ where: { id: { in: ids }, deletedAt: null } });
    if (found !== ids.length) {
      throw new ApiError(400, "Unknown employee id in employeeIds", [{ field: "employeeIds", message: "Unknown employee" }], "VALIDATION_ERROR");
    }
    await prisma.machine.update({ where: { id }, data: { authorizedOperators: { set: ids.map((employeeId) => ({ id: employeeId })) } } });
    return this.get(id);
  }

  async workOrders(id: number) {
    await this.find(id);
    const orders = await prisma.workOrder.findMany({
      where: { machineId: id }, orderBy: { openedAt: "desc" }, take: 50, include: workOrderInclude,
    });
    return orders.map(toWorkOrderDto);
  }

  async remove(id: number) {
    await this.find(id);
    const openOrders = await prisma.workOrder.count({
      where: { machineId: id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    });
    if (openOrders > 0) throw new ApiError(409, "Machine has open maintenance work orders");
    await prisma.machine.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async changeStatus(id: number, toStatus: MaintenanceStatus, comment: string | undefined, actorId: number, actorRole: string) {
    const machine = await this.find(id);
    if ((toStatus === "BREAKDOWN" || toStatus === "OUT_OF_SERVICE") && !comment) {
      throw new ApiError(400, "A comment is required for breakdown or out-of-service status");
    }
    if (machine.maintenanceStatus === toStatus) return toMachineDto(machine);
    if (machine.maintenanceStatus === "OUT_OF_SERVICE" && actorRole !== "ADMIN") {
      throw new ApiError(409, "Only an admin can restore an out-of-service machine");
    }
    if (!transitions[machine.maintenanceStatus].includes(toStatus)) {
      throw new ApiError(409, `Invalid transition from ${machine.maintenanceStatus} to ${toStatus}`);
    }
    const completesMaintenance = toStatus === "OPERATIONAL" && machine.maintenanceStatus === "UNDER_MAINTENANCE";
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.machine.update({
        where: { id },
        data: {
          maintenanceStatus: toStatus,
          ...(completesMaintenance ? {
            lastMaintenanceAt: now,
            ...(machine.maintenanceIntervalDays
              ? { nextMaintenanceDueAt: new Date(now.getTime() + machine.maintenanceIntervalDays * 24 * 60 * 60 * 1000) }
              : {}),
          } : {}),
        },
      });
      await tx.machineStatusLog.create({
        data: { machineId: id, fromStatus: machine.maintenanceStatus, toStatus, comment, changedById: actorId },
      });
      if (toStatus === "BREAKDOWN" || toStatus === "OUT_OF_SERVICE") {
        const admins = await tx.user.findMany({ where: { role: "ADMIN", enabled: true, deletedAt: null }, select: { id: true } });
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: toStatus === "BREAKDOWN" ? "MACHINE_BREAKDOWN" : "MACHINE_OUT_OF_SERVICE",
            title: `Machine ${toStatus.toLowerCase().replaceAll("_", " ")}`,
            message: `${machine.code} - ${machine.name}: ${comment}`,
            machineId: id,
          })),
        });
      }
      return next;
    });
    return toMachineDto(updated);
  }

  async history(id: number) {
    await this.find(id);
    return prisma.machineStatusLog.findMany({
      where: { machineId: id }, include: { changedBy: { select: { id: true, username: true, fullName: true } } },
      orderBy: { changedAt: "desc" },
    });
  }

  async addNote(id: number, note: string, actorId: number) {
    await this.find(id);
    return prisma.maintenanceNote.create({ data: { machineId: id, note, createdById: actorId } });
  }

  async notes(id: number) {
    await this.find(id);
    return prisma.maintenanceNote.findMany({
      where: { machineId: id }, include: { createdBy: { select: { id: true, username: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async overdue() {
    return toMachineDtos(await prisma.machine.findMany({
      where: { deletedAt: null, nextMaintenanceDueAt: { lt: new Date() } },
      orderBy: { nextMaintenanceDueAt: "asc" },
    }));
  }
}
