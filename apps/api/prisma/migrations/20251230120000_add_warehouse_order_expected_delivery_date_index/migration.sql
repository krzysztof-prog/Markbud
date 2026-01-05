-- Add index on WarehouseOrder.expectedDeliveryDate for performance
-- This field is frequently used in orderBy clauses for sorting warehouse orders
-- Used in routes/warehouse.ts lines 63 and 475 for pending order queries
CREATE INDEX "warehouse_orders_expected_delivery_date_idx" ON "warehouse_orders"("expected_delivery_date");

-- Add composite index on Order[deliveryDate, status] for performance
-- This combination is frequently queried together for delivery scheduling and status tracking
CREATE INDEX "orders_delivery_date_status_idx" ON "orders"("delivery_date", "status");

-- Add composite index on PendingOrderPrice[status, appliedAt] for cleanup queries
-- Used in PendingOrderPriceRepository.findOldApplied() for finding old applied prices
CREATE INDEX "pending_order_prices_status_applied_at_idx" ON "pending_order_prices"("status", "applied_at");
