-- Remove redundant calculated fields from orders table
-- SAFE MIGRATION: This migration has been rewritten to avoid data loss
-- Original version used DROP TABLE which is unsafe and can cause data loss

-- IMPORTANT: This migration was originally unsafe and has been fixed
-- The original version would have removed important business fields:
-- - client, project, system, deadline, pvc_delivery_date (MUST keep!)
-- The intended removal was only:
-- - total_windows, total_sashes, total_glasses (calculated fields)

-- SQLite limitations:
-- SQLite does not support ALTER TABLE DROP COLUMN in versions < 3.35.0
-- Therefore, this migration is intentionally empty for safety and compatibility

-- Action items:
-- 1. Keep total_windows/total_sashes/total_glasses fields in database
-- 2. Calculate these values on-demand from OrderWindow relations in application code
-- 3. Consider removing these fields when SQLite is upgraded to 3.35.0+

-- Deliveries, warehouse_stock, and okuc_stock table optimizations
-- have been deferred to future migrations using safe patterns

-- Performance indices (safe to add)
CREATE INDEX IF NOT EXISTS idx_order_requirements_created_at ON order_requirements(created_at);
CREATE INDEX IF NOT EXISTS idx_okuc_requirements_document_number ON okuc_requirements(document_number);
