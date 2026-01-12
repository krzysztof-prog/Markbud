-- P0-R2: Add pallet validation status fields
-- AlterTable
ALTER TABLE "pallet_optimizations" ADD COLUMN "validation_status" TEXT DEFAULT 'pending';
ALTER TABLE "pallet_optimizations" ADD COLUMN "validated_at" DATETIME;
ALTER TABLE "pallet_optimizations" ADD COLUMN "validation_errors" TEXT;
