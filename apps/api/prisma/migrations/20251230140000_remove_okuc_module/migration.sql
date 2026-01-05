-- Remove Okuc module completely from the system
-- This migration drops all Okuc-related tables

-- Drop tables in reverse order of dependencies (child tables first)
DROP TABLE IF EXISTS "okuc_product_images";
DROP TABLE IF EXISTS "okuc_history";
DROP TABLE IF EXISTS "okuc_requirements";
DROP TABLE IF EXISTS "okuc_orders";
DROP TABLE IF EXISTS "okuc_stock";
DROP TABLE IF EXISTS "okuc_imports";
DROP TABLE IF EXISTS "okuc_settings";
DROP TABLE IF EXISTS "okuc_articles";

-- Note: User model relations to Okuc tables have been removed from schema.prisma
-- All Okuc functionality has been removed from the application
