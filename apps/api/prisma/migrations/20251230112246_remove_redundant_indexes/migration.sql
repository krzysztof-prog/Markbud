-- Drop redundant indexes covered by unique constraints
-- SQLite automatically creates indexes for UNIQUE constraints, making explicit indexes redundant

-- OrderRequirement table: unique([orderId, profileId, colorId]) covers these indexes
DROP INDEX IF EXISTS "order_requirements_orderId_idx";
DROP INDEX IF EXISTS "order_requirements_orderId_colorId_idx";

-- WarehouseStock table: unique([profileId, colorId]) covers these indexes
DROP INDEX IF EXISTS "warehouse_stock_colorId_idx";
DROP INDEX IF EXISTS "warehouse_stock_profileId_idx";

-- WarehouseOrder table: unique([profileId, colorId, expectedDeliveryDate]) covers these indexes
DROP INDEX IF EXISTS "warehouse_orders_colorId_idx";
DROP INDEX IF EXISTS "warehouse_orders_profileId_idx";

-- DeliveryOrder table: unique([deliveryId, orderId]) covers this index
DROP INDEX IF EXISTS "delivery_orders_deliveryId_idx";

-- PalletOptimization table: @unique on deliveryId (line 306) covers this index
DROP INDEX IF EXISTS "pallet_optimizations_deliveryId_idx";
