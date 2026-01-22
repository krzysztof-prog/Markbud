-- CreateTable: Pozycje zamówienia Schüco
CREATE TABLE "schuco_order_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "schuco_delivery_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "article_number" TEXT NOT NULL,
    "article_description" TEXT NOT NULL,
    "ordered_qty" INTEGER NOT NULL,
    "shipped_qty" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'szt.',
    "dimensions" TEXT,
    "configuration" TEXT,
    "delivery_week" TEXT,
    "tracking" TEXT,
    "comment" TEXT,
    "change_type" TEXT,
    "changed_at" DATETIME,
    "changed_fields" TEXT,
    "previous_values" TEXT,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "schuco_order_items_schuco_delivery_id_fkey" FOREIGN KEY ("schuco_delivery_id") REFERENCES "schuco_deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "schuco_order_items_schuco_delivery_id_position_key" ON "schuco_order_items"("schuco_delivery_id", "position");

-- CreateIndex
CREATE INDEX "schuco_order_items_schuco_delivery_id_idx" ON "schuco_order_items"("schuco_delivery_id");

-- CreateIndex
CREATE INDEX "schuco_order_items_article_number_idx" ON "schuco_order_items"("article_number");

-- CreateIndex
CREATE INDEX "schuco_order_items_change_type_changed_at_idx" ON "schuco_order_items"("change_type", "changed_at");

-- AlterTable: Dodanie pola items_fetched_at do schuco_deliveries
ALTER TABLE "schuco_deliveries" ADD COLUMN "items_fetched_at" DATETIME;

-- CreateIndex
CREATE INDEX "schuco_deliveries_items_fetched_at_idx" ON "schuco_deliveries"("items_fetched_at");
