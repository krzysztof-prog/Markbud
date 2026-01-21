-- Dodanie kolumn sum materiałówki do tabeli orders
ALTER TABLE "orders" ADD COLUMN "windows_net_value" INTEGER;
ALTER TABLE "orders" ADD COLUMN "windows_material" INTEGER;
ALTER TABLE "orders" ADD COLUMN "assembly_value" INTEGER;
ALTER TABLE "orders" ADD COLUMN "extras_value" INTEGER;
ALTER TABLE "orders" ADD COLUMN "other_value" INTEGER;

-- Dodanie kolumny position do tabeli order_windows
ALTER TABLE "order_windows" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Dodanie relacji order_materials -> order_windows
ALTER TABLE "order_materials" ADD COLUMN "order_window_id" INTEGER REFERENCES "order_windows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "order_windows_order_id_position_idx" ON "order_windows"("order_id", "position");

-- CreateIndex
CREATE INDEX "order_materials_order_window_id_idx" ON "order_materials"("order_window_id");
