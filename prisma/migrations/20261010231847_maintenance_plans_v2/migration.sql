/*
  Warnings:

  - You are about to drop the column `created_by` on the `MaintenancePlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MaintenancePlan" DROP COLUMN "created_by",
ADD COLUMN     "created_by_id" INTEGER;

-- CreateIndex
CREATE INDEX "MaintenancePlan_machine_id_idx" ON "MaintenancePlan"("machine_id");

-- CreateIndex
CREATE INDEX "MaintenancePlan_next_due_date_idx" ON "MaintenancePlan"("next_due_date");

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
