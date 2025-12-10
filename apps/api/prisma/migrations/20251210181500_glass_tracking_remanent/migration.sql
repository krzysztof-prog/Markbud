-- Glass Tracking and Remanent Migration
-- Safe migration: only adds new columns and tables with defaults

-- 1. Add initialStockBeams to warehouse_stock
ALTER TABLE "warehouse_stock" ADD COLUMN "initial_stock_beams" INTEGER NOT NULL DEFAULT 0;

-- 2. Add glass tracking fields to orders
ALTER TABLE "orders" ADD COLUMN "ordered_glass_count" INTEGER DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "delivered_glass_count" INTEGER DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "glass_order_status" TEXT DEFAULT 'not_ordered';

-- 3. Create index for glass_order_status
CREATE INDEX "orders_glass_order_status_idx" ON "orders"("glass_order_status");

-- 4. Create glass_orders table
CREATE TABLE "glass_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "glass_order_number" TEXT NOT NULL,
    "order_date" DATETIME NOT NULL,
    "supplier" TEXT NOT NULL,
    "ordered_by" TEXT,
    "expected_delivery_date" DATETIME,
    "actual_delivery_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "glass_orders_glass_order_number_key" ON "glass_orders"("glass_order_number");
CREATE INDEX "glass_orders_glass_order_number_idx" ON "glass_orders"("glass_order_number");
CREATE INDEX "glass_orders_order_date_idx" ON "glass_orders"("order_date");
CREATE INDEX "glass_orders_status_idx" ON "glass_orders"("status");
CREATE INDEX "glass_orders_expected_delivery_date_idx" ON "glass_orders"("expected_delivery_date");

-- 5. Create glass_order_items table
CREATE TABLE "glass_order_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "glass_order_id" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "order_suffix" TEXT,
    "position" TEXT NOT NULL,
    "glass_type" TEXT NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "glass_order_items_glass_order_id_fkey" FOREIGN KEY ("glass_order_id") REFERENCES "glass_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "glass_order_items_order_number_fkey" FOREIGN KEY ("order_number") REFERENCES "orders" ("order_number") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "glass_order_items_glass_order_id_idx" ON "glass_order_items"("glass_order_id");
CREATE INDEX "glass_order_items_order_number_idx" ON "glass_order_items"("order_number");
CREATE INDEX "glass_order_items_order_number_order_suffix_idx" ON "glass_order_items"("order_number", "order_suffix");
CREATE INDEX "glass_order_items_width_mm_height_mm_idx" ON "glass_order_items"("width_mm", "height_mm");

-- 6. Create glass_deliveries table
CREATE TABLE "glass_deliveries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rack_number" TEXT NOT NULL,
    "customer_order_number" TEXT NOT NULL,
    "supplier_order_number" TEXT,
    "delivery_date" DATETIME NOT NULL,
    "file_import_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "glass_deliveries_file_import_id_fkey" FOREIGN KEY ("file_import_id") REFERENCES "file_imports" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "glass_deliveries_rack_number_idx" ON "glass_deliveries"("rack_number");
CREATE INDEX "glass_deliveries_customer_order_number_idx" ON "glass_deliveries"("customer_order_number");
CREATE INDEX "glass_deliveries_delivery_date_idx" ON "glass_deliveries"("delivery_date");

-- 7. Create glass_delivery_items table
CREATE TABLE "glass_delivery_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "glass_delivery_id" INTEGER NOT NULL,
    "glass_order_id" INTEGER,
    "order_number" TEXT NOT NULL,
    "order_suffix" TEXT,
    "position" TEXT NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "glass_composition" TEXT,
    "serial_number" TEXT,
    "client_code" TEXT,
    "match_status" TEXT NOT NULL DEFAULT 'pending',
    "matched_item_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "glass_delivery_items_glass_delivery_id_fkey" FOREIGN KEY ("glass_delivery_id") REFERENCES "glass_deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "glass_delivery_items_glass_order_id_fkey" FOREIGN KEY ("glass_order_id") REFERENCES "glass_orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "glass_delivery_items_glass_delivery_id_idx" ON "glass_delivery_items"("glass_delivery_id");
CREATE INDEX "glass_delivery_items_order_number_idx" ON "glass_delivery_items"("order_number");
CREATE INDEX "glass_delivery_items_order_number_order_suffix_idx" ON "glass_delivery_items"("order_number", "order_suffix");
CREATE INDEX "glass_delivery_items_match_status_idx" ON "glass_delivery_items"("match_status");
CREATE INDEX "glass_delivery_items_width_mm_height_mm_idx" ON "glass_delivery_items"("width_mm", "height_mm");

-- 8. Create glass_order_validations table
CREATE TABLE "glass_order_validations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "glass_order_id" INTEGER,
    "order_number" TEXT NOT NULL,
    "validation_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "expected_quantity" INTEGER,
    "ordered_quantity" INTEGER,
    "delivered_quantity" INTEGER,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" DATETIME,
    "resolved_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "glass_order_validations_glass_order_id_fkey" FOREIGN KEY ("glass_order_id") REFERENCES "glass_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "glass_order_validations_glass_order_id_idx" ON "glass_order_validations"("glass_order_id");
CREATE INDEX "glass_order_validations_order_number_idx" ON "glass_order_validations"("order_number");
CREATE INDEX "glass_order_validations_severity_idx" ON "glass_order_validations"("severity");
CREATE INDEX "glass_order_validations_resolved_idx" ON "glass_order_validations"("resolved");
