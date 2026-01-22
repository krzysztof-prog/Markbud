-- Migration: Add manualStatus field to Order
-- Date: 2026-01-21
-- Description: Dodaje pole ręcznego statusu zlecenia (NIE CIĄĆ, Anulowane, Wstrzymane)

-- Dodaj kolumny manualStatus i manualStatusSetAt
ALTER TABLE "orders" ADD COLUMN "manual_status" TEXT;
ALTER TABLE "orders" ADD COLUMN "manual_status_set_at" DATETIME;

-- Dodaj indeks dla szybkiego wyszukiwania po statusie
CREATE INDEX "orders_manual_status_idx" ON "orders"("manual_status");
