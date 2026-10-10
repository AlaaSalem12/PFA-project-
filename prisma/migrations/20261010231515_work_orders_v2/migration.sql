/*
  Warnings:

  - You are about to drop the column `created_by` on the `WorkOrder` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'WORK_ORDER_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_DUE';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "work_order_id" INTEGER;

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "created_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "resolution" TEXT;

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_machine_id_idx" ON "WorkOrder"("machine_id");

-- CreateIndex
CREATE INDEX "WorkOrder_assigned_to_id_idx" ON "WorkOrder"("assigned_to_id");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
