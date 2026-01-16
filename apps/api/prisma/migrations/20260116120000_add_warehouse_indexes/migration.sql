-- Dodanie indeksow dla czestych zapytan magazynowych
-- 2026-01-16 - Optymalizacja wydajnosci

-- Indeks na colorId dla WarehouseStock (czeste filtrowanie po kolorze)
CREATE INDEX IF NOT EXISTS "warehouse_stock_color_id_idx" ON "warehouse_stock"("color_id");

-- Indeks composite na colorId + status dla WarehouseOrder
-- Uzywany przy pobieraniu zamowien magazynowych dla danego koloru
CREATE INDEX IF NOT EXISTS "warehouse_orders_color_id_status_idx" ON "warehouse_orders"("color_id", "status");
