-- Add load_depth_mm column to pallet_types table
ALTER TABLE "pallet_types" ADD COLUMN "load_depth_mm" INTEGER NOT NULL DEFAULT 6000;
