-- DropIndex
DROP INDEX "glass_order_items_glass_order_id_position_key";

-- CreateIndex
CREATE INDEX "glass_order_items_glass_order_id_order_number_position_idx" ON "glass_order_items"("glass_order_id", "order_number", "position");

-- CreateIndex
CREATE INDEX "notes_order_id_idx" ON "notes"("order_id");

-- CreateIndex
CREATE INDEX "notes_created_by_id_idx" ON "notes"("created_by_id");
