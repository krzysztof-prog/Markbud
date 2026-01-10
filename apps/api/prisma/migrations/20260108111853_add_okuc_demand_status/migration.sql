-- AlterTable - Add okuc_demand_status column to orders table
ALTER TABLE "orders" ADD COLUMN "okuc_demand_status" TEXT DEFAULT 'none';

-- CreateIndex
CREATE INDEX "orders_okuc_demand_status_idx" ON "orders"("okuc_demand_status");
