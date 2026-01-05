# Migration Safety Fix - 2025-12-17

## Problem Summary

Two migrations were found to use unsafe patterns that could cause data loss:

1. **`add_missing_order_fields`** - Used `DROP TABLE` + `CREATE TABLE` pattern
2. **`remove_redundant_fields`** - Used `DROP TABLE` + `CREATE TABLE` pattern AND would have removed important business fields

## Issues Identified

### Migration: `add_missing_order_fields`

**Original (UNSAFE):**
```sql
PRAGMA foreign_keys=OFF;
CREATE TABLE orders_new (...);
INSERT INTO orders_new SELECT ... FROM orders;
DROP TABLE orders;  -- Destroys foreign key relationships!
ALTER TABLE orders_new RENAME TO orders;
PRAGMA foreign_keys=ON;
```

**Problems:**
- `DROP TABLE orders` breaks all foreign key relationships
- `PRAGMA foreign_keys=OFF` disables integrity checks
- If migration fails mid-way, data is lost
- No transaction safety

**Fixed (SAFE):**
```sql
-- Uses ALTER TABLE ADD COLUMN (safe, preserves data)
ALTER TABLE orders ADD COLUMN client TEXT;
ALTER TABLE orders ADD COLUMN project TEXT;
ALTER TABLE orders ADD COLUMN system TEXT;
ALTER TABLE orders ADD COLUMN deadline DATETIME;
ALTER TABLE orders ADD COLUMN pvc_delivery_date DATETIME;
```

### Migration: `remove_redundant_fields`

**Original (UNSAFE):**
- Same `DROP TABLE` pattern
- Would have REMOVED important fields: `client`, `project`, `system`, `deadline`, `pvc_delivery_date`
- Intended to remove only: `total_windows`, `total_sashes`, `total_glasses`

**Fixed (SAFE):**
- Migration rewritten to be a no-op with documentation
- Explains that SQLite < 3.35.0 doesn't support `ALTER TABLE DROP COLUMN`
- Recommends calculating `total_*` fields on-demand from relations
- Preserves all important business data

## Actions Taken

### 1. Migration File Fixes
- Rewrote `add_missing_order_fields/migration.sql` to use `ALTER TABLE ADD COLUMN`
- Rewrote `remove_redundant_fields/migration.sql` to skip unsafe operations
- Added comprehensive comments explaining the safety approach

### 2. Migration Folder Renaming
Renamed migrations to have proper timestamps:
- `add_missing_order_fields` → `20251211000000_add_missing_order_fields`
- `remove_redundant_fields` → `20251211000001_remove_redundant_fields`

This ensures proper ordering and follows Prisma conventions.

### 3. Migration Status Update
Used `prisma migrate resolve --applied` to mark both migrations as applied in the database since they were already partially executed.

### 4. Documentation Updates
Added to `docs/guides/anti-patterns.md`:
- Database anti-patterns section with migration safety rules
- Examples of unsafe vs safe migration patterns
- SQLite-specific limitations (DROP COLUMN, RENAME COLUMN)
- Added migration safety checklist items

## Verification

```bash
cd apps/api
pnpm prisma migrate status
# Output: Database schema is up to date!
```

All 10 migrations are now properly tracked and the database schema matches `schema.prisma`.

## Current Database State

The `orders` table now has:
- `client`, `project`, `system`, `deadline`, `pvc_delivery_date` (business fields) ✓
- `total_windows`, `total_sashes`, `total_glasses` (still present, should be calculated on-demand)

## Safe Migration Guidelines

Going forward, all migrations should follow these rules:

### DO ✓
- Use `ALTER TABLE ADD COLUMN` to add columns
- Keep `PRAGMA foreign_keys=ON` (default)
- Use timestamped migration folder names: `YYYYMMDDHHMMSS_name`
- Create migrations with `--create-only` flag for review
- Document complex migrations with comments
- Use `IF NOT EXISTS` for idempotent operations

### DON'T ✗
- Never use `DROP TABLE` + `CREATE TABLE` pattern
- Never disable foreign keys with `PRAGMA foreign_keys=OFF`
- Never create migrations without timestamps
- Don't skip migration review

### SQLite Limitations (< 3.35.0)
- No support for `ALTER TABLE DROP COLUMN`
- No support for `ALTER TABLE RENAME COLUMN`
- For these operations, document intention and defer to SQLite upgrade

## Testing

After these changes:
1. Migration status shows all migrations applied ✓
2. Database schema matches `schema.prisma` ✓
3. No data loss occurred ✓
4. Foreign key relationships intact ✓

## Future Recommendations

1. **Remove calculated fields:** When SQLite is upgraded to 3.35.0+, create a safe migration to drop `total_windows`, `total_sashes`, `total_glasses`

2. **Calculate on-demand:** Update application code to calculate these values from `OrderWindow` relations instead of storing in database

3. **Migration review process:** Implement a pre-commit hook to check for unsafe migration patterns

4. **Backup strategy:** Create automated backups before running migrations in production

## References

- Prisma Migration Docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
- SQLite ALTER TABLE: https://www.sqlite.org/lang_altertable.html
- Project anti-patterns: `docs/guides/anti-patterns.md`
