import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../common/api-error";
import { pageResponse } from "../../common/pagination";

const notificationSelect = {
  id: true, type: true, title: true, message: true, machineId: true, workOrderId: true, readAt: true, createdAt: true,
} satisfies Prisma.NotificationSelect;

/** Notifications are strictly per user: every query is scoped by userId. */
export class NotificationService {
  async list(userId: number, page: number, size: number, unreadOnly: boolean) {
    const where: Prisma.NotificationWhereInput = { userId, ...(unreadOnly ? { readAt: null } : {}) };
    const [content, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where, select: notificationSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: page * size, take: size,
      }),
      prisma.notification.count({ where }),
    ]);
    return pageResponse(content, total, page, size);
  }

  async unreadCount(userId: number): Promise<{ count: number }> {
    return { count: await prisma.notification.count({ where: { userId, readAt: null } }) };
  }

  async markRead(userId: number, id: number): Promise<void> {
    const result = await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
    if (result.count === 0) throw new ApiError(404, "Notification not found", [], "NOT_FOUND");
  }

  async markAllRead(userId: number): Promise<void> {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}
