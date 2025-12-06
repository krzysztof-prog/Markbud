-- CreateIndex: Delivery performance indexes
CREATE INDEX "deliveries_delivery_date_status_idx" ON "deliveries"("delivery_date", "status");

-- CreateIndex: Delivery performance indexes (reverse order)
CREATE INDEX "deliveries_status_delivery_date_idx" ON "deliveries"("status", "delivery_date");

-- CreateIndex: Order performance indexes for archived and status queries
CREATE INDEX "orders_archived_at_status_idx" ON "orders"("archived_at", "status");

-- CreateIndex: Order performance indexes for created date and archived queries
CREATE INDEX "orders_created_at_archived_at_idx" ON "orders"("created_at", "archived_at");

-- CreateIndex: Order performance indexes for status and archived queries
CREATE INDEX "orders_status_archived_at_idx" ON "orders"("status", "archived_at");

-- CreateIndex: OrderRequirement composite index for demand calculations
CREATE INDEX "order_requirements_order_id_profile_id_color_id_idx" ON "order_requirements"("order_id", "profile_id", "color_id");

-- CreateIndex: SchucoDelivery change tracking index
CREATE INDEX "schuco_deliveries_change_type_changed_at_idx" ON "schuco_deliveries"("change_type", "changed_at");

-- CreateIndex: SchucoDelivery date and status index
CREATE INDEX "schuco_deliveries_order_date_parsed_shipping_status_idx" ON "schuco_deliveries"("order_date_parsed", "shipping_status");

-- CreateIndex: SchucoDelivery status and date index (reverse order)
CREATE INDEX "schuco_deliveries_shipping_status_order_date_parsed_idx" ON "schuco_deliveries"("shipping_status", "order_date_parsed");

-- CreateIndex: FileImport status and creation date index
CREATE INDEX "file_imports_status_created_at_idx" ON "file_imports"("status", "created_at");
