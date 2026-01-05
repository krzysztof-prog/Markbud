-- Add missing index on DeliveryOrder.deliveryId for performance
-- This is heavily used in DeliveryRepository queries (WHERE deliveryId, aggregate by deliveryId, etc.)
CREATE INDEX "delivery_orders_delivery_id_idx" ON "delivery_orders"("delivery_id");

-- Add compound index on OrderRequirement[orderId, colorId] for combined lookups
-- Useful for queries filtering by both order and color together
CREATE INDEX "order_requirements_order_id_color_id_idx" ON "order_requirements"("order_id", "color_id");

-- Remove redundant Order indexes that are duplicates of compound indexes
-- These were creating unnecessary overhead without providing query benefits

-- DropIndex: orders_archived_at_status_idx (redundant with status_archived_at)
DROP INDEX IF EXISTS "orders_archived_at_status_idx";

-- DropIndex: orders_created_at_archived_at_idx (rarely used compound)
DROP INDEX IF EXISTS "orders_created_at_archived_at_idx";
