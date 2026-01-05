#!/bin/bash
# Script to apply userId NOT NULL migration

echo "=== Applying userId NOT NULL Migration ==="
echo ""

# Step 1: Update schema.prisma
echo "Step 1: Updating schema.prisma..."
cd apps/api

# Use sed to replace nullable userId fields
sed -i 's/updatedById         Int?     @map("updated_by_id")/updatedById         Int      @map("updated_by_id")/g' prisma/schema.prisma
sed -i 's/updatedBy           User?    @relation("UpdatedBy"/updatedBy           User     @relation("UpdatedBy"/g' prisma/schema.prisma

sed -i 's/createdById          Int?     @map("created_by_id")/createdById          Int      @map("created_by_id")/g' prisma/schema.prisma
sed -i 's/createdBy            User?    @relation("WarehouseOrderCreatedBy"/createdBy            User     @relation("WarehouseOrderCreatedBy"/g' prisma/schema.prisma
sed -i 's/createdBy            User?       @relation("OkucCreatedBy"/createdBy            User        @relation("OkucCreatedBy"/g' prisma/schema.prisma

sed -i 's/recordedById    Int?     @map("recorded_by_id")/recordedById    Int      @map("recorded_by_id")/g' prisma/schema.prisma
sed -i 's/recordedBy      User?    @relation("RecordedBy"/recordedBy      User     @relation("RecordedBy"/g' prisma/schema.prisma

sed -i 's/updatedById     Int?        @map("updated_by_id")/updatedById     Int         @map("updated_by_id")/g' prisma/schema.prisma
sed -i 's/updatedBy       User?       @relation("OkucUpdatedBy"/updatedBy       User        @relation("OkucUpdatedBy"/g' prisma/schema.prisma

sed -i 's/recordedById   Int?        @map("recorded_by_id")/recordedById   Int         @map("recorded_by_id")/g' prisma/schema.prisma
sed -i 's/recordedBy     User?       @relation("OkucRecordedBy"/recordedBy     User        @relation("OkucRecordedBy"/g' prisma/schema.prisma

sed -i 's/createdById  Int?      @map("created_by_id")/createdById  Int       @map("created_by_id")/g' prisma/schema.prisma
sed -i 's/createdBy    User?     @relation("OkucImportedBy"/createdBy    User      @relation("OkucImportedBy"/g' prisma/schema.prisma

sed -i 's/createdById Int?     @map("created_by_id")/createdById Int      @map("created_by_id")/g' prisma/schema.prisma
sed -i 's/createdBy   User?    @relation(fields: \[createdById\]/createdBy   User     @relation(fields: \[createdById\]/g' prisma/schema.prisma

echo "✓ Schema updated"
echo ""

# Step 2: Mark migration as applied
echo "Step 2: Marking migration as applied..."
pnpm prisma migrate resolve --applied 20251230112214_make_userid_not_null

echo ""
echo "✓ Migration marked as applied"
echo ""

# Step 3: Generate Prisma client
echo "Step 3: Generating Prisma client..."
pnpm prisma generate

echo ""
echo "=== Migration Complete ==="
echo ""
echo "Next steps:"
echo "1. Review the changes in schema.prisma"
echo "2. Commit the migration files and schema changes"
echo "3. Ensure all code that creates these records provides a userId"
