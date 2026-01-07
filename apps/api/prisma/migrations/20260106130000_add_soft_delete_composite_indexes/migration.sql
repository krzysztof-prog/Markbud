-- Soft delete composite indexes
-- Added: 2026-01-06
-- Purpose: Optimize queries that filter by status AND deletedAt together

-- Delivery: Optimize filtering active deliveries by status
CREATE INDEX IF NOT EXISTS "deliveries_status_deletedAt_idx" ON "deliveries"("status", "deleted_at");
