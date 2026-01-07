-- Performance optimization indexes
-- Added: 2026-01-06

-- DeliveryOrder: Optimize ordering within deliveries
CREATE INDEX IF NOT EXISTS "delivery_orders_deliveryId_position_idx" ON "delivery_orders"("delivery_id", "position");

-- Order: Optimize glass status + archive filtering
CREATE INDEX IF NOT EXISTS "orders_glassOrderStatus_archivedAt_idx" ON "orders"("glass_order_status", "archived_at");
