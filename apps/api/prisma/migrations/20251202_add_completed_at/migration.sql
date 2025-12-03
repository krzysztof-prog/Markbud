-- AlterTable
ALTER TABLE "orders" ADD COLUMN "completed_at" TIMESTAMP;

-- Backfill: for existing completed orders, use updated_at as completed_at
UPDATE "orders"
SET "completed_at" = "updated_at"
WHERE "status" = 'completed' AND "completed_at" IS NULL;
