-- AlterTable: Dodaj pole remanent_date do warehouse_stock
-- Data remanentu ustawiana ręcznie podczas inwentaryzacji, NIE automatycznie przez Prisma

ALTER TABLE "warehouse_stock" ADD COLUMN "remanent_date" DATETIME;

-- Ustaw domyślną datę remanentu na 01.01.2026 dla istniejących rekordów
UPDATE "warehouse_stock" SET "remanent_date" = '2026-01-01 00:00:00.000' WHERE "remanent_date" IS NULL;
