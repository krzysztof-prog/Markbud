-- AlterTable: Make Order relation optional in GlassOrderItem
-- This allows importing glass orders that reference production orders not yet in the system

PRAGMA foreign_keys=off;

-- Create new table WITHOUT order_number foreign key constraint
CREATE TABLE "glass_order_items_new" (
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
    CONSTRAINT "glass_order_items_glass_order_id_fkey" FOREIGN KEY ("glass_order_id") REFERENCES "glass_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data
INSERT INTO "glass_order_items_new" SELECT * FROM "glass_order_items";

-- Drop old table
DROP TABLE "glass_order_items";

-- Rename new table
ALTER TABLE "glass_order_items_new" RENAME TO "glass_order_items";

-- Recreate indexes
CREATE INDEX "glass_order_items_width_mm_height_mm_idx" ON "glass_order_items"("width_mm", "height_mm");
CREATE INDEX "glass_order_items_order_number_order_suffix_idx" ON "glass_order_items"("order_number", "order_suffix");
CREATE INDEX "glass_order_items_order_number_idx" ON "glass_order_items"("order_number");
CREATE INDEX "glass_order_items_glass_order_id_idx" ON "glass_order_items"("glass_order_id");

PRAGMA foreign_keys=on;
