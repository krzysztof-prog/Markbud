-- Test script to verify indexes after migration
-- Run this against your database after applying the migration

-- Show all indexes for affected tables
.mode column
.headers on

SELECT 'OrderRequirement Indexes:' as info;
SELECT name, sql
FROM sqlite_master
WHERE type='index' AND tbl_name='order_requirements'
ORDER BY name;

SELECT '';
SELECT 'WarehouseStock Indexes:' as info;
SELECT name, sql
FROM sqlite_master
WHERE type='index' AND tbl_name='warehouse_stock'
ORDER BY name;

SELECT '';
SELECT 'WarehouseOrder Indexes:' as info;
SELECT name, sql
FROM sqlite_master
WHERE type='index' AND tbl_name='warehouse_orders'
ORDER BY name;

SELECT '';
SELECT 'DeliveryOrder Indexes:' as info;
SELECT name, sql
FROM sqlite_master
WHERE type='index' AND tbl_name='delivery_orders'
ORDER BY name;

SELECT '';
SELECT 'PalletOptimization Indexes:' as info;
SELECT name, sql
FROM sqlite_master
WHERE type='index' AND tbl_name='pallet_optimizations'
ORDER BY name;

-- Summary: Count indexes per table
SELECT '';
SELECT 'Index Count Summary:' as info;
SELECT
  tbl_name,
  COUNT(*) as index_count
FROM sqlite_master
WHERE type='index'
  AND tbl_name IN (
    'order_requirements',
    'warehouse_stock',
    'warehouse_orders',
    'delivery_orders',
    'pallet_optimizations'
  )
GROUP BY tbl_name
ORDER BY tbl_name;
