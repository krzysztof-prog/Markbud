-- Add profile_depths table
CREATE TABLE IF NOT EXISTS "profile_depths" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_type" TEXT NOT NULL,
    "depth_mm" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- Add packing_rules table
CREATE TABLE IF NOT EXISTS "packing_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "rule_config" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- Create unique index for profile_type
CREATE UNIQUE INDEX IF NOT EXISTS "profile_depths_profile_type_key" ON "profile_depths"("profile_type");
