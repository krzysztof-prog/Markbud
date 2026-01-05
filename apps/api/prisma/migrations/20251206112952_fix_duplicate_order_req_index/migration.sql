-- DropIndex: Remove duplicate composite index on order_requirements (if exists)
-- The @@unique constraint already creates an index on (order_id, profile_id, color_id)
-- This duplicate index wastes ~50KB and slows down INSERT/UPDATE operations

DROP INDEX IF EXISTS "order_requirements_order_id_profile_id_color_id_idx";
