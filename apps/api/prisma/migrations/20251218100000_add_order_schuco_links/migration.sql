-- CreateTable: schuco_deliveries (if not exists)
CREATE TABLE IF NOT EXISTS "schuco_deliveries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_date" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "project_number" TEXT NOT NULL,
    "order_name" TEXT NOT NULL,
    "shipping_status" TEXT NOT NULL,
    "delivery_week" TEXT,
    "delivery_type" TEXT,
    "tracking" TEXT,
    "complaint" TEXT,
    "order_type" TEXT,
    "total_amount" TEXT,
    "raw_data" TEXT,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "order_date_parsed" DATETIME,
    "change_type" TEXT,
    "changed_at" DATETIME,
    "changed_fields" TEXT,
    "previous_values" TEXT,
    "is_warehouse_item" BOOLEAN NOT NULL DEFAULT false,
    "extracted_order_nums" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "schuco_deliveries_order_number_key" ON "schuco_deliveries"("order_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schuco_deliveries_fetched_at_idx" ON "schuco_deliveries"("fetched_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schuco_deliveries_order_number_idx" ON "schuco_deliveries"("order_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schuco_deliveries_order_date_idx" ON "schuco_deliveries"("order_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schuco_deliveries_order_date_parsed_idx" ON "schuco_deliveries"("order_date_parsed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schuco_deliveries_change_type_idx" ON "schuco_deliveries"("change_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schuco_deliveries_is_warehouse_item_idx" ON "schuco_deliveries"("is_warehouse_item");

-- CreateTable: order_schuco_links
CREATE TABLE IF NOT EXISTS "order_schuco_links" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "schuco_delivery_id" INTEGER NOT NULL,
    "linked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linked_by" TEXT,
    CONSTRAINT "order_schuco_links_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_schuco_links_schuco_delivery_id_fkey" FOREIGN KEY ("schuco_delivery_id") REFERENCES "schuco_deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_schuco_links_order_id_idx" ON "order_schuco_links"("order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_schuco_links_schuco_delivery_id_idx" ON "order_schuco_links"("schuco_delivery_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "order_schuco_links_order_id_schuco_delivery_id_key" ON "order_schuco_links"("order_id", "schuco_delivery_id");
