# PowerShell script to apply userId NOT NULL migration

Write-Host "=== Applying userId NOT NULL Migration ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Update schema.prisma
Write-Host "Step 1: Updating schema.prisma..." -ForegroundColor Yellow
Set-Location apps\api

$schemaPath = "prisma\schema.prisma"
$schema = Get-Content $schemaPath -Raw

# Replace nullable userId fields with NOT NULL
$replacements = @{
    'updatedById         Int?     @map("updated_by_id")' = 'updatedById         Int      @map("updated_by_id")'
    'updatedBy           User?    @relation("UpdatedBy"' = 'updatedBy           User     @relation("UpdatedBy"'
    'createdById          Int?     @map("created_by_id")' = 'createdById          Int      @map("created_by_id")'
    'createdBy            User?    @relation("WarehouseOrderCreatedBy"' = 'createdBy            User     @relation("WarehouseOrderCreatedBy"'
    'recordedById    Int?     @map("recorded_by_id")' = 'recordedById    Int      @map("recorded_by_id")'
    'recordedBy      User?    @relation("RecordedBy"' = 'recordedBy      User     @relation("RecordedBy"'
    'updatedById     Int?        @map("updated_by_id")' = 'updatedById     Int         @map("updated_by_id")'
    'updatedBy       User?       @relation("OkucUpdatedBy"' = 'updatedBy       User        @relation("OkucUpdatedBy"'
    'createdById          Int?        @map("created_by_id")' = 'createdById          Int         @map("created_by_id")'
    'createdBy            User?       @relation("OkucCreatedBy"' = 'createdBy            User        @relation("OkucCreatedBy"'
    'recordedById   Int?        @map("recorded_by_id")' = 'recordedById   Int         @map("recorded_by_id")'
    'recordedBy     User?       @relation("OkucRecordedBy"' = 'recordedBy     User        @relation("OkucRecordedBy"'
    'createdById  Int?      @map("created_by_id")' = 'createdById  Int       @map("created_by_id")'
    'createdBy    User?     @relation("OkucImportedBy"' = 'createdBy    User      @relation("OkucImportedBy"'
    'createdById Int?     @map("created_by_id")' = 'createdById Int      @map("created_by_id")'
    'createdBy   User?    @relation(fields: [createdById]' = 'createdBy   User     @relation(fields: [createdById]'
}

foreach ($key in $replacements.Keys) {
    $schema = $schema -replace [regex]::Escape($key), $replacements[$key]
}

Set-Content $schemaPath -Value $schema
Write-Host "✓ Schema updated" -ForegroundColor Green
Write-Host ""

# Step 2: Mark migration as applied
Write-Host "Step 2: Marking migration as applied..." -ForegroundColor Yellow
pnpm prisma migrate resolve --applied 20251230112214_make_userid_not_null

Write-Host ""
Write-Host "✓ Migration marked as applied" -ForegroundColor Green
Write-Host ""

# Step 3: Generate Prisma client
Write-Host "Step 3: Generating Prisma client..." -ForegroundColor Yellow
pnpm prisma generate

Write-Host ""
Write-Host "=== Migration Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the changes in schema.prisma"
Write-Host "2. Commit the migration files and schema changes"
Write-Host "3. Ensure all code that creates these records provides a userId"

# Return to root directory
Set-Location ..\..
