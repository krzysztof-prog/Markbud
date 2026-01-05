# userId NOT NULL Migration - Complete Package

## What This Migration Does

Enforces data integrity by making `userId` fields required (NOT NULL) in all audit and history tables. This ensures every database action is attributed to a specific user, creating a complete audit trail.

## 📁 Files Created

### 1. Migration Files
- **`apps/api/prisma/migrations/20251230112214_make_userid_not_null/migration.sql`**
  - Complete SQL migration script
  - Safe to run multiple times (idempotent)
  - Includes system user creation, NULL updates, table recreation, and verification

### 2. Application Scripts
- **`apply-userid-migration.ps1`** - PowerShell script for Windows
- **`apply-userid-migration.sh`** - Bash script for Unix/Git Bash
- **`update-schema-userids.js`** - Node.js utility (used by scripts)

### 3. Documentation Files
- **`MIGRATION_USERID_NOT_NULL.md`** - Complete technical documentation
- **`MIGRATION_SUMMARY.md`** - Quick reference and overview
- **`CODE_CHANGES_CHECKLIST.md`** - Developer guide for required code changes
- **`README_MIGRATION.md`** - This file

## 🚀 Quick Start

### Step 1: Review the Migration

Review what will be changed:
```bash
cat apps/api/prisma/migrations/20251230112214_make_userid_not_null/migration.sql
```

### Step 2: Apply the Migration

**Option A - PowerShell (Recommended for Windows):**
```powershell
.\apply-userid-migration.ps1
```

**Option B - Bash (Git Bash/WSL):**
```bash
bash apply-userid-migration.sh
```

**Option C - Manual:**
```bash
cd apps/api
pnpm prisma migrate resolve --applied 20251230112214_make_userid_not_null
pnpm prisma generate
cd ../..
```

### Step 3: Update Your Code

Follow the checklist in `CODE_CHANGES_CHECKLIST.md` to update your code.

### Step 4: Test

Verify everything works:
```bash
# Run tests
pnpm test

# Check TypeScript compilation
pnpm typecheck

# Start dev server
pnpm dev
```

## 📊 Impact Summary

### Tables Affected (9)
1. WarehouseHistory - `recordedById`
2. WarehouseStock - `updatedById`
3. WarehouseOrder - `createdById`
4. OkucHistory - `recordedById`
5. OkucStock - `updatedById`
6. OkucOrder - `createdById`
7. OkucRequirement - `recordedById`
8. OkucImport - `createdById`
9. Note - `createdById`

### Schema Changes
- All `Int?` userId fields → `Int` (required)
- All `User?` relations → `User` (required)

### System User Created
- **ID**: 1
- **Email**: system@akrobud.local
- **Name**: System User
- **Role**: system

## 📝 Required Code Changes

### Before Migration
```typescript
// This was valid - userId is optional
await prisma.warehouseHistory.create({
  data: {
    profileId: 1,
    colorId: 2,
    calculatedStock: 10,
    actualStock: 8,
    difference: -2,
    // recordedById not provided
  }
});
```

### After Migration
```typescript
// This is now REQUIRED
await prisma.warehouseHistory.create({
  data: {
    profileId: 1,
    colorId: 2,
    calculatedStock: 10,
    actualStock: 8,
    difference: -2,
    recordedById: userId, // MUST provide userId
  }
});
```

### Getting userId

**In HTTP Handlers:**
```typescript
async function handler(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user?.id;
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }

  await service.performAction(data, userId);
}
```

**For System Operations:**
```typescript
const SYSTEM_USER_ID = 1;

// For automated processes, cron jobs, migrations
await service.performSystemAction(data, SYSTEM_USER_ID);
```

## ✅ Verification

After applying the migration, verify it worked:

```bash
cd apps/api
pnpm prisma studio
```

Run these SQL queries - all should return 0:
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

## 🐛 Troubleshooting

### TypeScript Errors After Migration

**Good!** TypeScript errors after migration show where userId is missing.

```
Error: Property 'recordedById' is missing in type
```

This helps you find all the places that need updating. Use `CODE_CHANGES_CHECKLIST.md` to systematically fix them.

### Migration Already Applied Error

If you see "Migration already applied":
```bash
# Migration is already marked as applied, just regenerate client
cd apps/api
pnpm prisma generate
```

### System User Not Found

If system user doesn't exist:
```sql
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  1,
  'system@akrobud.local',
  '$2a$10$dummy.hash.for.system.user.placeholder',
  'System User',
  'system',
  datetime('now'),
  datetime('now')
);
```

## 🔄 Rollback (If Needed)

If you need to undo this migration:

```bash
# 1. Revert schema.prisma
git checkout HEAD -- apps/api/prisma/schema.prisma

# 2. Remove migration directory
rm -rf apps/api/prisma/migrations/20251230112214_make_userid_not_null

# 3. Regenerate Prisma client
cd apps/api
pnpm prisma generate

# 4. Update code back to optional userId
# (This will require manual code changes)
```

## 📚 Documentation

- **Complete Technical Docs**: `MIGRATION_USERID_NOT_NULL.md`
- **Quick Reference**: `MIGRATION_SUMMARY.md`
- **Code Changes Guide**: `CODE_CHANGES_CHECKLIST.md`

## ✨ Benefits

1. **Data Integrity** - Every action has an author
2. **Audit Trail** - Complete who/what/when tracking
3. **Security** - No anonymous changes
4. **Type Safety** - TypeScript enforces userId
5. **Consistency** - Uniform approach across all audit tables

## 🎯 Next Steps

1. ✅ Migration files created
2. ⏳ Apply migration (run script)
3. ⏳ Update code (use checklist)
4. ⏳ Run tests
5. ⏳ Manual testing
6. ⏳ Commit changes

## 📦 Files to Commit

After successful migration and testing:

```bash
git add apps/api/prisma/migrations/20251230112214_make_userid_not_null/
git add apps/api/prisma/schema.prisma
git add MIGRATION_USERID_NOT_NULL.md
git add MIGRATION_SUMMARY.md
git add CODE_CHANGES_CHECKLIST.md
git commit -m "feat: Make userId NOT NULL in audit/history tables"
```

## 🗑️ Files to Delete After Use

These are temporary helper files:
- `apply-userid-migration.ps1`
- `apply-userid-migration.sh`
- `update-schema-userids.js`
- `README_MIGRATION.md` (this file)

## 📞 Support

For questions or issues:

1. Check the comprehensive docs: `MIGRATION_USERID_NOT_NULL.md`
2. Review the code checklist: `CODE_CHANGES_CHECKLIST.md`
3. Inspect the migration SQL to understand changes
4. Verify system user exists in database
5. Ensure Prisma client is regenerated

## 🎉 Success Criteria

Migration is successful when:
- [x] Migration SQL created
- [ ] Migration marked as applied
- [ ] Schema.prisma updated
- [ ] Prisma client regenerated
- [ ] No NULL userId values in database
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] Application runs without errors

---

**Ready to proceed?** Run `.\apply-userid-migration.ps1` (Windows) or `bash apply-userid-migration.sh` (Unix) to start!
