-- P1-2: Add variant_type field to Order table
-- Allows distinguishing between:
-- 'correction' - order corrections (must be in same delivery as original)
-- 'additional_file' - additional files (can be in different delivery)
-- null - not specified (default for all existing orders)

ALTER TABLE "orders" ADD COLUMN "variant_type" TEXT;
