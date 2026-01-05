# Index Optimization - Validation Checklist

Use this checklist to verify the migration was successful.

## Pre-Migration Checks

- [ ] Backup database: `cp prisma/dev.db prisma/dev.db.backup`
- [ ] Review migration file: `cat prisma/migrations/20251230112246_remove_redundant_indexes/migration.sql`
- [ ] Ensure Prisma schema is valid: `pnpm prisma validate`

## Apply Migration

- [ ] Navigate to API directory: `cd apps/api`
- [ ] Apply migration: `pnpm db:migrate`
- [ ] Check migration status: `pnpm prisma migrate status`
- [ ] Regenerate client: `pnpm db:generate`

## Post-Migration Validation

### 1. Schema Validation

- [ ] **OrderRequirement** - Should have 4 indexes:
  - [ ] `@@unique([orderId, profileId, colorId])`
  - [ ] `@@index([colorId])`
  - [ ] `@@index([profileId])`
  - [ ] `@@index([createdAt])`

- [ ] **WarehouseStock** - Should have 1 index:
  - [ ] `@@unique([profileId, colorId])`

- [ ] **WarehouseOrder** - Should have 3 indexes:
  - [ ] `@@unique([profileId, colorId, expectedDeliveryDate])`
  - [ ] `@@index([status])`
  - [ ] `@@index([expectedDeliveryDate])`

- [ ] **DeliveryOrder** - Should have 1 index:
  - [ ] `@@unique([deliveryId, orderId])`

- [ ] **PalletOptimization** - Should have 1 index:
  - [ ] `deliveryId Int @unique`

### 2. Database Verification

Run: `sqlite3 prisma/dev.db < test-index-removal.sql`

Expected results:

- [ ] **OrderRequirement**: Should NOT have indexes named:
  - `order_requirements_orderId_idx` ❌
  - `order_requirements_orderId_colorId_idx` ❌

- [ ] **WarehouseStock**: Should NOT have indexes named:
  - `warehouse_stock_colorId_idx` ❌
  - `warehouse_stock_profileId_idx` ❌

- [ ] **WarehouseOrder**: Should NOT have indexes named:
  - `warehouse_orders_colorId_idx` ❌
  - `warehouse_orders_profileId_idx` ❌

- [ ] **DeliveryOrder**: Should NOT have index named:
  - `delivery_orders_deliveryId_idx` ❌

- [ ] **PalletOptimization**: Should NOT have index named:
  - `pallet_optimizations_deliveryId_idx` ❌

### 3. Query Performance Testing

Run: `npx tsx verify-index-queries.ts`

- [ ] Test 1: OrderRequirement by orderId - completes successfully
- [ ] Test 2: OrderRequirement by orderId + colorId - completes successfully
- [ ] Test 3: OrderRequirement by createdAt - completes successfully
- [ ] Test 4: WarehouseStock by profileId + colorId - completes successfully
- [ ] Test 5: WarehouseStock by profileId - completes successfully
- [ ] Test 6: WarehouseOrder by status - completes successfully
- [ ] Test 7: WarehouseOrder by profileId - completes successfully
- [ ] Test 8: DeliveryOrder by deliveryId - completes successfully
- [ ] Test 9: PalletOptimization by deliveryId - completes successfully
- [ ] Test 10: Complex join query - completes successfully

### 4. Application Testing

- [ ] Start API server: `pnpm dev:api`
- [ ] API starts without errors
- [ ] No console warnings related to database
- [ ] Swagger UI loads: http://localhost:3001/docs

### 5. Integration Tests

- [ ] Run full test suite: `pnpm test`
- [ ] All tests pass
- [ ] No new test failures
- [ ] No timeout errors

### 6. Functional Testing

Test these key features in the application:

**Orders Module:**
- [ ] View orders list
- [ ] Filter orders by status
- [ ] Search orders
- [ ] Create new order
- [ ] Update order

**Warehouse Module:**
- [ ] View warehouse stock
- [ ] Filter by profile
- [ ] Filter by color
- [ ] Update stock levels
- [ ] Create warehouse order

**Deliveries Module:**
- [ ] View deliveries list
- [ ] Filter deliveries
- [ ] Create delivery
- [ ] Add orders to delivery
- [ ] Optimize pallets

**Glass Orders Module:**
- [ ] View glass orders
- [ ] Import glass delivery
- [ ] Match delivery items
- [ ] View validations

### 7. Performance Monitoring

If possible, compare before/after:

- [ ] Query response times (should be same or better)
- [ ] Database file size (should be slightly smaller)
- [ ] Memory usage (should be unchanged)
- [ ] CPU usage during writes (should be same or slightly lower)

## Troubleshooting

### Issue: Migration fails with "index not found"

**Solution:** Index may already be removed. Mark as resolved:
```bash
pnpm prisma migrate resolve --applied 20251230112246_remove_redundant_indexes
```

### Issue: Queries seem slower

**Solution 1:** Run ANALYZE
```bash
sqlite3 prisma/dev.db "ANALYZE;"
```

**Solution 2:** Check query plans
```bash
sqlite3 prisma/dev.db
EXPLAIN QUERY PLAN SELECT * FROM order_requirements WHERE order_id = 1;
```

### Issue: API won't start

**Solution:** Regenerate Prisma client
```bash
pnpm db:generate
rm -rf node_modules/.prisma
pnpm install
```

### Issue: Tests failing

**Solution:** Check migration status
```bash
pnpm prisma migrate status
```

If behind, apply migrations:
```bash
pnpm db:migrate
```

## Rollback Procedure (if needed)

**⚠️ Only use if absolutely necessary:**

1. Create rollback migration:
   ```bash
   pnpm prisma migrate dev --name restore_redundant_indexes
   ```

2. Edit the migration file with:
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

3. Apply rollback:
   ```bash
   pnpm db:migrate
   ```

4. Update schema.prisma to add back removed indexes

**Note:** Rollback is NOT recommended as these indexes are truly redundant.

## Success Criteria

Migration is successful when:

✅ All 9 redundant indexes removed from schema
✅ All 9 redundant indexes dropped from database
✅ All query tests pass with same performance
✅ API starts without errors
✅ All integration tests pass
✅ Application functionality unchanged
✅ No console errors or warnings

## Sign-Off

- [ ] Pre-migration checks completed
- [ ] Migration applied successfully
- [ ] Schema validation passed
- [ ] Database verification passed
- [ ] Query performance tests passed
- [ ] Application tests passed
- [ ] Functional testing passed
- [ ] No issues detected
- [ ] Documentation reviewed

**Validated by:** _________________
**Date:** _________________
**Environment:** [ ] Development [ ] Staging [ ] Production

---

## Additional Verification Commands

### Check Prisma migration history
```bash
pnpm prisma migrate status
```

### List all indexes in database
```bash
sqlite3 prisma/dev.db "SELECT name, tbl_name FROM sqlite_master WHERE type='index' ORDER BY tbl_name, name;"
```

### Check specific table indexes
```bash
sqlite3 prisma/dev.db "PRAGMA index_list('order_requirements');"
sqlite3 prisma/dev.db "PRAGMA index_list('warehouse_stock');"
sqlite3 prisma/dev.db "PRAGMA index_list('warehouse_orders');"
sqlite3 prisma/dev.db "PRAGMA index_list('delivery_orders');"
sqlite3 prisma/dev.db "PRAGMA index_list('pallet_optimizations');"
```

### Verify index usage in queries
```bash
sqlite3 prisma/dev.db
.eqp on
SELECT * FROM order_requirements WHERE order_id = 1;
SELECT * FROM warehouse_stock WHERE profile_id = 1 AND color_id = 1;
SELECT * FROM delivery_orders WHERE delivery_id = 1;
.exit
```

---

**Questions?** Refer to:
- `INDEX_OPTIMIZATION_SUMMARY.md` - Executive summary
- `APPLY_INDEX_MIGRATION.md` - Detailed guide
- `REDUNDANT_INDEXES_REMOVED.md` - Technical documentation
- `INDEX_OPTIMIZATION_DIAGRAM.md` - Visual guide
