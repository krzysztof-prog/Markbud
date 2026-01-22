-- AlterTable
ALTER TABLE "glass_delivery_items" ADD COLUMN "customer_order_number" TEXT;
ALTER TABLE "glass_delivery_items" ADD COLUMN "rack_number" TEXT;

-- CreateIndex
CREATE INDEX "glass_delivery_items_customer_order_number_idx" ON "glass_delivery_items"("customer_order_number");
