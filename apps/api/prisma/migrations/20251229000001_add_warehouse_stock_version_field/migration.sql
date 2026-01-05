-- Migration: Add version field to warehouse_stock for optimistic locking
-- Date: 2025-12-29
-- Description: Adds version field to WarehouseStock table to prevent lost updates from concurrent modifications

-- Add version column with default 0
-- SQLite doesn't support ADD COLUMN with NOT NULL and default in one step for existing tables
-- So we need to use a multi-step approach

-- Step 1: Add version column as nullable
ALTER TABLE warehouse_stock ADD COLUMN version INTEGER;

-- Step 2: Set default value for existing rows
UPDATE warehouse_stock SET version = 0 WHERE version IS NULL;

-- Note: SQLite doesn't support altering column constraints after creation
-- The schema.prisma defines it as @default(0), which will apply to new inserts
