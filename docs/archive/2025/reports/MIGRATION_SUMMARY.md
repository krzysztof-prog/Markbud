# Migration Summary: Make userId NOT NULL

## Created Files

### 1. Migration SQL
**Path**: `apps/api/prisma/migrations/20251230112214_make_userid_not_null/migration.sql`

Contains the SQL migration that:
- Creates system user (id = 1) if not exists
- Updates all NULL userId values to system user ID
- Recreates tables with NOT NULL constraints
- Rebuilds all indexes
- Includes verification queries

### 2. Application Scripts

**PowerShell** (Windows): `apply-userid-migration.ps1`
- Updates schema.prisma
- Marks migration as applied
- Generates Prisma client

**Bash** (Unix/Git Bash): `apply-userid-migration.sh`
- Same functionality as PowerShell script
- For Unix-like environments

### 3. Documentation

**Path**: `MIGRATION_USERID_NOT_NULL.md`

Complete documentation including:
- Overview and affected tables
- Step-by-step application instructions
- Code impact and required changes
- Verification queries
- Rollback instructions
- Testing checklist

## Quick Start

### To Apply Migration:

```powershell
# Windows PowerShell
.\apply-userid-migration.ps1
```

OR

```bash
# Git Bash / WSL
bash apply-userid-migration.sh
```

### Manual Application:

```bash
cd apps/api
pnpm prisma migrate resolve --applied 20251230112214_make_userid_not_null
pnpm prisma generate
```

## Schema Changes Summary

### Tables Modified (9 total):

1. **WarehouseHistory.recordedById**: `Int?` → `Int`
2. **WarehouseStock.updatedById**: `Int?` → `Int`
3. **WarehouseOrder.createdById**: `Int?` → `Int`
4. **OkucHistory.recordedById**: `Int?` → `Int`
5. **OkucStock.updatedById**: `Int?` → `Int`
6. **OkucOrder.createdById**: `Int?` → `Int`
7. **OkucRequirement.recordedById**: `Int?` → `Int`
8. **OkucImport.createdById**: `Int?` → `Int`
9. **Note.createdById**: `Int?` → `Int`

### Relations Updated:

All corresponding `User?` relations changed to `User` (non-nullable).

## Why This Migration?

**Before**: userId fields were nullable, allowing records to be created without attribution.

**After**: Every record MUST have a userId, ensuring:
- Complete audit trail
- Data integrity
- Security compliance
- Type safety in TypeScript

## System User

A system user (id = 1) is created for:
- Automated processes
- Cron jobs
- Data migrations
- System operations

**Details**:
- Email: `system@akrobud.local`
- Name: `System User`
- Role: `system`

## Code Impact

All code creating records in affected tables must now provide `userId`:

```typescript
// Example - WarehouseHistory
await prisma.warehouseHistory.create({
  data: {
    profileId,
    colorId,
    calculatedStock,
    actualStock,
    difference,
    recordedById: userId, // NOW REQUIRED!
  }
});
```

## Verification

After applying, run these queries - all should return 0:

```sql
SELECT COUNT(*) FROM warehouse_history WHERE recorded_by_id IS NULL;
SELECT COUNT(*) FROM warehouse_stock WHERE updated_by_id IS NULL;
SELECT COUNT(*) FROM warehouse_orders WHERE created_by_id IS NULL;
SELECT COUNT(*) FROM okuc_history WHERE recorded_by_id IS NULL;
SELECT COUNT(*) FROM okuc_stock WHERE updated_by_id IS NULL;
SELECT COUNT(*) FROM okuc_orders WHERE created_by_id IS NULL;
SELECT COUNT(*) FROM okuc_requirements WHERE recorded_by_id IS NULL;
SELECT COUNT(*) FROM okuc_imports WHERE created_by_id IS NULL;
SELECT COUNT(*) FROM notes WHERE created_by_id IS NULL;
```

## Next Steps

1. ✅ Migration files created
2. ⏳ Apply migration using provided scripts
3. ⏳ Update schema.prisma (done by scripts)
4. ⏳ Generate Prisma client (done by scripts)
5. ⏳ Review code for any required changes
6. ⏳ Test all affected operations
7. ⏳ Commit changes to repository

## Files to Commit

After successful migration, commit:
- `apps/api/prisma/migrations/20251230112214_make_userid_not_null/migration.sql`
- `apps/api/prisma/schema.prisma` (updated)
- `MIGRATION_USERID_NOT_NULL.md` (documentation)
- `MIGRATION_SUMMARY.md` (this file)

You can delete after use:
- `apply-userid-migration.ps1`
- `apply-userid-migration.sh`
- `update-schema-userids.js`

## Support

For issues or questions:
1. Check `MIGRATION_USERID_NOT_NULL.md` for detailed documentation
2. Review the migration SQL to understand what changes are made
3. Verify system user exists in database
4. Ensure Prisma client is regenerated

## Status

- ✅ Migration SQL created
- ✅ Application scripts created
- ✅ Documentation complete
- ⏳ Migration not yet applied (waiting for manual execution)
- ⏳ Schema.prisma not yet updated (will be done by scripts)

Run the application script to proceed with the migration.
