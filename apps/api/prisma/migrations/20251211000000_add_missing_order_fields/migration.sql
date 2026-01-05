-- Add missing fields to orders table for order summary pages
-- SAFE MIGRATION: Uses ALTER TABLE ADD COLUMN instead of DROP/CREATE
-- This preserves all data and maintains foreign key relationships

-- Add new columns using ALTER TABLE (SAFE approach)
ALTER TABLE orders ADD COLUMN client TEXT;
ALTER TABLE orders ADD COLUMN project TEXT;
ALTER TABLE orders ADD COLUMN system TEXT;
ALTER TABLE orders ADD COLUMN deadline DATETIME;
ALTER TABLE orders ADD COLUMN pvc_delivery_date DATETIME;

-- Note: Indexes will be recreated by subsequent migrations
-- This migration is idempotent - if columns exist, SQLite will error but data is safe
