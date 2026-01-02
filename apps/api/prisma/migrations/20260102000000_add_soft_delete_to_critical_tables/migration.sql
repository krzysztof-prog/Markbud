-- AddSoftDeleteToCriticalTables
-- Add deletedAt column to WarehouseStock, Delivery, and GlassOrder tables

-- AlterTable: Add deletedAt to warehouse_stock
ALTER TABLE "warehouse_stock" ADD COLUMN "deleted_at" DATETIME;

-- CreateIndex: Index for deletedAt on warehouse_stock
CREATE INDEX "warehouse_stock_deleted_at_idx" ON "warehouse_stock"("deleted_at");

-- AlterTable: Add deletedAt to deliveries
ALTER TABLE "deliveries" ADD COLUMN "deleted_at" DATETIME;

-- CreateIndex: Index for deletedAt on deliveries
CREATE INDEX "deliveries_deleted_at_idx" ON "deliveries"("deleted_at");

-- AlterTable: Add deletedAt to glass_orders
ALTER TABLE "glass_orders" ADD COLUMN "deleted_at" DATETIME;

-- CreateIndex: Index for deletedAt on glass_orders
CREATE INDEX "glass_orders_deleted_at_idx" ON "glass_orders"("deleted_at");
