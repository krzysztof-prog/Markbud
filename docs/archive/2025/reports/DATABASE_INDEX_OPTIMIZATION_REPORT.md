# Database Index Optimization Report

## Date: 2025-12-30

## Summary
Added missing database indexes to improve query performance for frequently accessed fields in the AKROBUD ERP system.

## Requirements Analysis

### From Original Report:
1. **Composite index: order.deliveryDate + status** ✅ ADDED
2. **Index: warehouseOrder.expectedDeliveryDate** ✅ ADDED
3. **Index: fileImport.status + createdAt** ✅ ALREADY EXISTS (line 344 in schema.prisma)

### Additional Indexes Discovered:
4. **Composite index: pendingOrderPrice.status + appliedAt** ✅ ADDED

## Changes Made

### 1. Migration File Created
**Location:** `apps/api/prisma/migrations/20251230120000_add_warehouse_order_expected_delivery_date_index/migration.sql`

**Contents:**
- Added index on `WarehouseOrder.expectedDeliveryDate`
  - Used in `routes/warehouse.ts` lines 63 and 475 for sorting warehouse orders by expected delivery date

- Added composite index on `Order[deliveryDate, status]`
  - Improves queries that filter/sort orders by delivery date and status together

- Added composite index on `PendingOrderPrice[status, appliedAt]`
  - Used in `PendingOrderPriceRepository.findOldApplied()` for cleanup operations

### 2. Schema.prisma Updates

#### Order Model (lines 114-122)
```prisma
@@index([status])
@@index([archivedAt])
@@index([createdAt])
@@index([invoiceNumber, createdAt])
@@index([invoiceNumber, deliveryDate])
@@index([status, archivedAt])
@@index([glassOrderStatus])
@@index([deliveryDate, status])  // ← NEW
```

#### WarehouseOrder Model (lines 190-194)
```prisma
@@unique([profileId, colorId, expectedDeliveryDate])
@@index([status])
@@index([expectedDeliveryDate])  // ← NEW
```

**Note:** The `colorId` and `profileId` indexes were previously removed in migration `20251230112246_remove_redundant_indexes` because they are covered by the unique constraint on `[profileId, colorId, expectedDeliveryDate]`. SQLite automatically creates indexes for unique constraints.

#### PendingOrderPrice Model (lines 807-813)
```prisma
@@index([orderNumber])
@@index([status])
@@index([orderNumber, status])
@@index([expiresAt])
@@index([status, expiresAt])
@@index([status, appliedAt])  // ← NEW
```

## Query Performance Impact

### Before:
- Warehouse order queries sorting by `expectedDeliveryDate` performed full table scans
- Order queries filtering by `deliveryDate` + `status` required multiple index lookups
- Pending order price cleanup queries on `status` + `appliedAt` were inefficient

### After:
- Direct index lookup for warehouse orders sorted by delivery date
- Single composite index lookup for order delivery date + status queries
- Optimized cleanup queries for pending order prices

## Testing Recommendations

1. **Run Migration:**
   ```bash
   cd apps/api
   pnpm db:migrate
   ```

2. **Generate Prisma Client:**
   ```bash
   pnpm db:generate
   ```

3. **Verify Indexes:**
   ```bash
   sqlite3 apps/api/prisma/dev.db ".indexes warehouse_orders"
   sqlite3 apps/api/prisma/dev.db ".indexes orders"
   sqlite3 apps/api/prisma/dev.db ".indexes pending_order_prices"
   ```

4. **Performance Testing:**
   - Test warehouse order queries: `GET /api/warehouse/stock?profileId=X&colorId=Y`
   - Test order delivery queries: `GET /api/orders?status=in_progress&deliveryDate=2025-01`
   - Test pending price cleanup: Run the cleanup scheduler service

## Files Modified

1. `apps/api/prisma/schema.prisma`
   - Added 3 new index directives

2. `apps/api/prisma/migrations/20251230120000_add_warehouse_order_expected_delivery_date_index/migration.sql`
   - Created new migration with 3 CREATE INDEX statements

## Index Strategy Notes

### SQLite Unique Constraints
SQLite automatically creates indexes for UNIQUE constraints. Therefore:
- `WarehouseOrder.unique([profileId, colorId, expectedDeliveryDate])` automatically indexes those fields
- Explicit indexes on `profileId` and `colorId` alone are redundant and were removed in previous migration
- However, `expectedDeliveryDate` alone is NOT covered by the unique constraint, so it needs its own index

### Composite Index Order
For composite indexes, the column order matters:
- `[deliveryDate, status]` is efficient for queries that filter/sort by deliveryDate first, then status
- `[status, deliveryDate]` (already exists in Delivery model) is efficient for the reverse
- Having both allows flexible querying

### Index Maintenance
- Indexes speed up reads but slow down writes
- Current write volume is low enough that the performance benefit outweighs the cost
- Monitor database size growth as indexes do take up space

## Related Documentation
- Backend Dev Guidelines: `/skills/backend-dev-guidelines`
- Database Schema: `apps/api/prisma/schema.prisma`
- Performance Optimization Progress: `.beads/performance-optimization-progress.md`
