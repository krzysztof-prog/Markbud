-- AlterTable
ALTER TABLE "schuco_deliveries" ADD COLUMN "archived_at" DATETIME;

-- CreateIndex
CREATE INDEX "schuco_deliveries_archived_at_idx" ON "schuco_deliveries"("archived_at");
