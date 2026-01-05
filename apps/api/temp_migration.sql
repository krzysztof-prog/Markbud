-- DropIndex
DROP INDEX "order_windows_profile_type_idx";

-- DropIndex
DROP INDEX "schuco_deliveries_order_number_fetched_at_idx";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_warehouse_stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "current_stock_beams" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,
    "updated_by_id" INTEGER,
    "initial_stock_beams" INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_warehouse_stock" ("color_id", "current_stock_beams", "id", "initial_stock_beams", "profile_id", "updated_at", "updated_by_id") SELECT "color_id", "current_stock_beams", "id", "initial_stock_beams", "profile_id", "updated_at", "updated_by_id" FROM "warehouse_stock";
DROP TABLE "warehouse_stock";
ALTER TABLE "new_warehouse_stock" RENAME TO "warehouse_stock";
CREATE UNIQUE INDEX "warehouse_stock_profile_id_color_id_key" ON "warehouse_stock"("profile_id" ASC, "color_id" ASC);
CREATE INDEX "warehouse_stock_profile_id_idx" ON "warehouse_stock"("profile_id" ASC);
CREATE INDEX "warehouse_stock_color_id_idx" ON "warehouse_stock"("color_id" ASC);
CREATE TABLE "new_warehouse_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "calculated_stock" INTEGER NOT NULL,
    "actual_stock" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" INTEGER,
    FOREIGN KEY ("recorded_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_warehouse_history" ("actual_stock", "calculated_stock", "color_id", "difference", "id", "profile_id", "recorded_at", "recorded_by_id") SELECT "actual_stock", "calculated_stock", "color_id", "difference", "id", "profile_id", "recorded_at", "recorded_by_id" FROM "warehouse_history";
DROP TABLE "warehouse_history";
ALTER TABLE "new_warehouse_history" RENAME TO "warehouse_history";
CREATE INDEX "warehouse_history_recorded_at_idx" ON "warehouse_history"("recorded_at" ASC);
CREATE INDEX "warehouse_history_profile_id_idx" ON "warehouse_history"("profile_id" ASC);
CREATE INDEX "warehouse_history_color_id_idx" ON "warehouse_history"("color_id" ASC);
CREATE TABLE "new_glass_order_items" (
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
    FOREIGN KEY ("glass_order_id") REFERENCES "glass_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_glass_order_items" ("created_at", "glass_order_id", "glass_type", "height_mm", "id", "order_number", "order_suffix", "position", "quantity", "width_mm") SELECT "created_at", "glass_order_id", "glass_type", "height_mm", "id", "order_number", "order_suffix", "position", "quantity", "width_mm" FROM "glass_order_items";
DROP TABLE "glass_order_items";
ALTER TABLE "new_glass_order_items" RENAME TO "glass_order_items";
CREATE INDEX "glass_order_items_glass_order_id_idx" ON "glass_order_items"("glass_order_id" ASC);
CREATE INDEX "glass_order_items_order_number_idx" ON "glass_order_items"("order_number" ASC);
CREATE INDEX "glass_order_items_order_number_order_suffix_idx" ON "glass_order_items"("order_number" ASC, "order_suffix" ASC);
CREATE INDEX "glass_order_items_width_mm_height_mm_idx" ON "glass_order_items"("width_mm" ASC, "height_mm" ASC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

