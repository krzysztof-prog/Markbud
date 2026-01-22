-- DropIndex
DROP INDEX "glass_delivery_items_glass_delivery_id_position_key";

-- CreateIndex
CREATE INDEX "glass_delivery_items_glass_delivery_id_order_number_position_idx" ON "glass_delivery_items"("glass_delivery_id", "order_number", "position");
