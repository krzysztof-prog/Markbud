-- Dodaje pole delivery_date do schuco_deliveries i schuco_order_items
-- Sparsowana data dostawy (poniedziałek danego tygodnia) obliczona z delivery_week

-- SchucoDelivery - poziom zamówienia
ALTER TABLE "schuco_deliveries" ADD COLUMN "delivery_date" DATETIME;

-- SchucoOrderItem - poziom pozycji
ALTER TABLE "schuco_order_items" ADD COLUMN "delivery_date" DATETIME;

-- Indeksy dla szybkiego sortowania/filtrowania
CREATE INDEX "schuco_deliveries_delivery_date_idx" ON "schuco_deliveries"("delivery_date");
CREATE INDEX "schuco_order_items_delivery_date_idx" ON "schuco_order_items"("delivery_date");
