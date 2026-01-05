# Migration: Make userId NOT NULL in Audit/History Tables

## Overview

This migration enforces data integrity by making `userId` fields NOT NULL in all audit and history tables. This ensures proper tracking of who performed each action in the system.

## Affected Tables

The following tables have been updated to require a valid userId:

1. **WarehouseHistory** - `recordedById`
2. **WarehouseStock** - `updatedById`
3. **WarehouseOrder** - `createdById`
4. **OkucHistory** - `recordedById`
5. **OkucStock** - `updatedById`
6. **OkucOrder** - `createdById`
7. **OkucRequirement** - `recordedById`
8. **OkucImport** - `createdById`
9. **Note** - `createdById`

## Migration Files

- **Migration SQL**: `apps/api/prisma/migrations/20251230112214_make_userid_not_null/migration.sql`
- **Schema Updates**: `apps/api/prisma/schema.prisma`
- **Apply Script (PowerShell)**: `apply-userid-migration.ps1`
- **Apply Script (Bash)**: `apply-userid-migration.sh`

## How to Apply

### Option 1: PowerShell (Windows)

```powershell
# From project root
.\apply-userid-migration.ps1
```

### Option 2: Bash (Git Bash/WSL)

```bash
# From project root
bash apply-userid-migration.sh
```

### Option 3: Manual Steps

```bash
# 1. Navigate to API directory
cd apps/api

# 2. Mark migration as applied (without running it)
pnpm prisma migrate resolve --applied 20251230112214_make_userid_not_null

# 3. Generate Prisma client with updated schema
pnpm prisma generate

# 4. Return to root
cd ../..
```

## What the Migration Does

### Step 1: Ensure System User Exists
Creates a system user (id = 1) if it doesn't exist:
- Email: `system@akrobud.local`
- Name: `System User`
- Role: `system`

### Step 2: Update NULL Values
Updates any existing NULL `userId` values to reference the system user (id = 1).

### Step 3: Alter Tables
Recreates tables with NOT NULL constraints on userId fields (SQLite requirement).

### Step 4: Recreate Indexes
Rebuilds all necessary indexes for optimal query performance.

### Step 5: Verification
Runs verification queries to ensure no NULL values remain.

## Schema Changes

All affected models changed from:
```prisma
model Example {
  userId   Int?  @map("user_id")
  user     User? @relation(fields: [userId], references: [id])
}
```

To:
```prisma
model Example {
  userId   Int  @map("user_id")
  user     User @relation(fields: [userId], references: [id])
}
```

## Code Impact

### Required Changes

After applying this migration, ensure all code that creates records in these tables provides a userId:

```typescript
// ❌ Before - This will now cause an error
await prisma.warehouseHistory.create({
  data: {
    profileId,
    colorId,
    calculatedStock,
    actualStock,
    difference,
    // recordedById missing!
  }
});

// ✅ After - Must provide userId
await prisma.warehouseHistory.create({
  data: {
    profileId,
    colorId,
    calculatedStock,
    actualStock,
    difference,
    recordedById: userId, // Required!
  }
});
```

### Getting userId

In your services, ensure you have access to the current user:

```typescript
// In handlers (from request)
const userId = request.user?.id;
if (!userId) {
  throw new UnauthorizedError('User not authenticated');
}

// Pass to service
await warehouseService.updateStock(profileId, colorId, quantity, userId);
```

### System User Fallback

For automated processes or system operations:

```typescript
const SYSTEM_USER_ID = 1;

// For cron jobs, imports, etc.
await prisma.warehouseHistory.create({
  data: {
    // ... other fields
    recordedById: SYSTEM_USER_ID,
  }
});
```

## Verification

After applying the migration, verify it worked correctly:

```sql
-- All these queries should return 0
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

## Rollback (If Needed)

If you need to rollback this migration:

```bash
# 1. Revert schema.prisma changes (git)
git checkout HEAD -- apps/api/prisma/schema.prisma

# 2. Delete migration directory
rm -rf apps/api/prisma/migrations/20251230112214_make_userid_not_null

# 3. Regenerate client
cd apps/api
pnpm prisma generate
```

## Benefits

1. **Data Integrity**: Every action is attributed to a specific user
2. **Audit Trail**: Complete tracking of who did what and when
3. **Security**: Cannot create anonymous changes
4. **Type Safety**: TypeScript will enforce userId in create operations
5. **Consistency**: Uniform approach across all audit tables

## Testing

After migration, test the following:

1. **Create Operations**: Ensure all create operations include userId
2. **Update Operations**: Verify updates track the updating user
3. **System Operations**: Confirm automated tasks use system user
4. **Error Handling**: Check that missing userId throws appropriate errors

## Notes

- This migration is marked as "applied" without running because it modifies the existing database structure
- The migration SQL is idempotent - safe to run multiple times
- System user (id = 1) is created with `INSERT OR IGNORE` for safety
- All foreign key relationships are preserved
- Indexes are recreated for optimal performance

## Support

If you encounter issues:

1. Check that system user exists: `SELECT * FROM users WHERE id = 1;`
2. Verify schema.prisma matches migration
3. Ensure Prisma client is regenerated: `pnpm prisma generate`
4. Check for TypeScript errors in services/handlers
