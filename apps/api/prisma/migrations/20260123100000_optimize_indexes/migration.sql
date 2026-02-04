-- Optymalizacja indeksów bazy danych
-- Data: 2026-01-23
--
-- Zmiany:
-- 1. Usunięto 5 duplikujących się indeksów (@@unique automatycznie tworzy indeks)
-- 2. Dodano 2 brakujące indeksy FK dla optymalizacji JOINów

-- DropIndex (duplikaty - @@unique już tworzy te indeksy)
DROP INDEX IF EXISTS "monthly_reports_year_month_idx";
DROP INDEX IF EXISTS "production_reports_year_month_idx";
DROP INDEX IF EXISTS "time_entries_date_worker_id_idx";
DROP INDEX IF EXISTS "okuc_articles_article_id_idx";
DROP INDEX IF EXISTS "glass_orders_glass_order_number_idx";

-- CreateIndex (brakujące indeksy FK)
CREATE INDEX IF NOT EXISTS "delivery_items_delivery_id_idx" ON "delivery_items"("delivery_id");
CREATE INDEX IF NOT EXISTS "glass_deliveries_file_import_id_idx" ON "glass_deliveries"("file_import_id");
