-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPERATIONAL', 'SCHEDULED_MAINTENANCE', 'UNDER_MAINTENANCE', 'BREAKDOWN', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MACHINE_BREAKDOWN', 'MACHINE_OUT_OF_SERVICE', 'PASSWORD_RESET');

-- DropIndex
DROP INDEX "Machine_status_idx";

-- Preserve the legacy machine state while moving to the maintenance state machine.
ALTER TABLE "Machine" ADD COLUMN "maintenance_status" "MaintenanceStatus";
UPDATE "Machine"
SET "maintenance_status" = CASE "status"
  WHEN 'BREAKDOWN' THEN 'BREAKDOWN'::"MaintenanceStatus"
  WHEN 'MAINTENANCE' THEN 'UNDER_MAINTENANCE'::"MaintenanceStatus"
  WHEN 'RETIRED' THEN 'OUT_OF_SERVICE'::"MaintenanceStatus"
  ELSE 'OPERATIONAL'::"MaintenanceStatus"
END;
ALTER TABLE "Machine"
  ALTER COLUMN "maintenance_status" SET DEFAULT 'OPERATIONAL',
  ALTER COLUMN "maintenance_status" SET NOT NULL,
  DROP COLUMN "created_by",
  DROP COLUMN "status",
  ADD COLUMN "created_by_id" INTEGER,
  ADD COLUMN "image_url" TEXT,
  ADD COLUMN "last_maintenance_at" TIMESTAMP(3),
  ADD COLUMN "location" TEXT,
  ADD COLUMN "next_maintenance_due_at" TIMESTAMP(3),
  ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "app_users" DROP COLUMN "created_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "refresh_token_version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "must_change_password" SET DEFAULT true;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineStatusLog" (
    "id" SERIAL NOT NULL,
    "machine_id" INTEGER NOT NULL,
    "from_status" "MaintenanceStatus",
    "to_status" "MaintenanceStatus" NOT NULL,
    "comment" TEXT,
    "changed_by_id" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceNote" (
    "id" SERIAL NOT NULL,
    "machine_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "machine_id" INTEGER,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_user_id_expires_at_idx" ON "PasswordResetToken"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "MachineStatusLog_machine_id_changed_at_idx" ON "MachineStatusLog"("machine_id", "changed_at");

-- CreateIndex
CREATE INDEX "MaintenanceNote_machine_id_created_at_idx" ON "MaintenanceNote"("machine_id", "created_at");

-- CreateIndex
CREATE INDEX "Notification_user_id_read_at_created_at_idx" ON "Notification"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entity_id_idx" ON "AuditLog"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- CreateIndex
CREATE INDEX "Machine_maintenance_status_idx" ON "Machine"("maintenance_status");

-- CreateIndex
CREATE INDEX "Machine_next_maintenance_due_at_idx" ON "Machine"("next_maintenance_due_at");

-- CreateIndex
CREATE INDEX "app_users_role_idx" ON "app_users"("role");

-- CreateIndex
CREATE INDEX "app_users_enabled_idx" ON "app_users"("enabled");

-- CreateIndex
CREATE INDEX "app_users_deleted_at_idx" ON "app_users"("deleted_at");

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineStatusLog" ADD CONSTRAINT "MachineStatusLog_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineStatusLog" ADD CONSTRAINT "MachineStatusLog_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNote" ADD CONSTRAINT "MaintenanceNote_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNote" ADD CONSTRAINT "MaintenanceNote_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
