# How to Apply Index Removal Migration

## Quick Start

```bash
# 1. Navigate to API directory
cd apps/api

# 2. Apply the migration
pnpm db:migrate

# 3. Verify Prisma Client is up to date
pnpm db:generate

# 4. Restart API server
pnpm dev:api
```

## Detailed Steps

### Step 1: Review the Migration

```bash
# View the migration SQL
cat prisma/migrations/20251230112246_remove_redundant_indexes/migration.sql
```

The migration will drop 9 redundant indexes:
- 2 indexes from `order_requirements`
- 2 indexes from `warehouse_stock`
- 2 indexes from `warehouse_orders`
- 1 index from `delivery_orders`
- 1 index from `pallet_optimizations`

### Step 2: Backup Database (Optional but Recommended)

```bash
# SQLite backup
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)

# Or for production
sqlite3 prisma/dev.db ".backup 'prisma/dev.db.backup'"
```

### Step 3: Apply Migration

```bash
# Development
pnpm db:migrate

# Production - with explicit name
pnpm prisma migrate deploy
```

Expected output:
```
Applying migration `20251230112246_remove_redundant_indexes`
The following migration(s) have been applied:

migrations/
  └─ 20251230112246_remove_redundant_indexes/
    └─ migration.sql

Your database is now in sync with your schema.
```

### Step 4: Verify Migration Success

#### Option A: Check with SQLite CLI

```bash
# Open database
sqlite3 prisma/dev.db

# List indexes for affected tables
.mode column
.headers on

SELECT name, tbl_name
FROM sqlite_master
WHERE type='index'
  AND tbl_name IN (
    'order_requirements',
    'warehouse_stock',
    'warehouse_orders',
    'delivery_orders',
    'pallet_optimizations'
  )
ORDER BY tbl_name, name;

.exit
```

#### Option B: Use test script

```bash
sqlite3 prisma/dev.db < test-index-removal.sql
```

#### Option C: Run query verification

```bash
# Run query performance tests
npx tsx verify-index-queries.ts
```

### Step 5: Run Tests

```bash
# Run API tests
pnpm test

# Run specific tests
pnpm test orderRequirement
pnpm test warehouse
pnpm test delivery
```

### Step 6: Monitor in Production

After deploying to production, monitor these metrics:

1. **Query Performance**
   - Check slow query logs
   - Monitor average query time
   - Watch for timeout errors

2. **Database Load**
   - CPU usage should stay same or decrease slightly
   - Memory usage should be unchanged
   - Disk I/O should decrease slightly (less index maintenance)

## Troubleshooting

### Migration Fails with "index not found"

This is expected if indexes were already removed. Solution:

```bash
# Skip this specific migration
pnpm prisma migrate resolve --applied 20251230112246_remove_redundant_indexes
```

### Queries Seem Slower

1. Check if indexes were actually removed:
   ```bash
   sqlite3 prisma/dev.db "SELECT * FROM sqlite_master WHERE type='index' AND name LIKE '%orderId%';"
   ```

2. Run ANALYZE to update statistics:
   ```bash
   sqlite3 prisma/dev.db "ANALYZE;"
   ```

3. Compare EXPLAIN QUERY PLAN before/after:
   ```sql
   EXPLAIN QUERY PLAN
   SELECT * FROM order_requirements WHERE order_id = 1;
   ```

### Need to Rollback

If absolutely necessary (not recommended):

```bash
# Create a new migration that adds indexes back
pnpm prisma migrate dev --name restore_indexes

# Then manually edit the migration file with:
```

```sql
CREATE INDEX "order_requirements_orderId_idx" ON "order_requirements"("order_id");
CREATE INDEX "order_requirements_orderId_colorId_idx" ON "order_requirements"("order_id", "color_id");
CREATE INDEX "warehouse_stock_colorId_idx" ON "warehouse_stock"("color_id");
CREATE INDEX "warehouse_stock_profileId_idx" ON "warehouse_stock"("profile_id");
CREATE INDEX "warehouse_orders_colorId_idx" ON "warehouse_orders"("color_id");
CREATE INDEX "warehouse_orders_profileId_idx" ON "warehouse_orders"("profile_id");
CREATE INDEX "delivery_orders_deliveryId_idx" ON "delivery_orders"("delivery_id");
CREATE INDEX "pallet_optimizations_deliveryId_idx" ON "pallet_optimizations"("delivery_id");
```

## Expected Results

### Before Migration

```
order_requirements: 6 indexes (including 2 redundant)
warehouse_stock: 3 indexes (including 2 redundant)
warehouse_orders: 4 indexes (including 2 redundant)
delivery_orders: 2 indexes (including 1 redundant)
pallet_optimizations: 2 indexes (including 1 redundant)
```

### After Migration

```
order_requirements: 4 indexes (all necessary)
warehouse_stock: 1 index (unique constraint)
warehouse_orders: 2 indexes (unique + status)
delivery_orders: 1 index (unique constraint)
pallet_optimizations: 1 index (unique constraint)
```

## Performance Expectations

- **Query Performance:** Unchanged or slightly improved (less index contention)
- **Write Performance:** Slightly improved (less index maintenance)
- **Disk Space:** Minimal reduction (each index uses small amount of space)
- **Memory Usage:** Unchanged

## Additional Resources

- Full documentation: `REDUNDANT_INDEXES_REMOVED.md`
- SQLite index documentation: https://www.sqlite.org/lang_createindex.html
- Prisma migration docs: https://www.prisma.io/docs/concepts/components/prisma-migrate

## Questions?

If you encounter any issues:

1. Check migration file: `prisma/migrations/20251230112246_remove_redundant_indexes/migration.sql`
2. Review full report: `REDUNDANT_INDEXES_REMOVED.md`
3. Run verification: `npx tsx verify-index-queries.ts`
4. Check Prisma schema: `prisma/schema.prisma`

## Summary

This migration is **safe** and **non-breaking**:
- ✅ Removes 9 truly redundant indexes
- ✅ All queries continue to work via unique constraint indexes
- ✅ No application code changes needed
- ✅ Slight performance improvement expected
- ✅ Easy to apply and verify
