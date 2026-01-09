-- Add missing indexes to okuc_orders table for better query performance
CREATE INDEX IF NOT EXISTS "okuc_orders_basket_type_idx" ON "okuc_orders"("basket_type");
CREATE INDEX IF NOT EXISTS "okuc_orders_status_idx" ON "okuc_orders"("status");
CREATE INDEX IF NOT EXISTS "okuc_orders_expected_delivery_date_idx" ON "okuc_orders"("expected_delivery_date");
CREATE INDEX IF NOT EXISTS "okuc_orders_status_basket_type_idx" ON "okuc_orders"("status", "basket_type");
CREATE INDEX IF NOT EXISTS "okuc_orders_deleted_at_idx" ON "okuc_orders"("deleted_at");
