-- CreateTable
CREATE TABLE "order_materials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "glazing" INTEGER NOT NULL DEFAULT 0,
    "fittings" INTEGER NOT NULL DEFAULT 0,
    "parts" INTEGER NOT NULL DEFAULT 0,
    "glass_quantity" INTEGER NOT NULL DEFAULT 0,
    "material" INTEGER NOT NULL DEFAULT 0,
    "assembly_value_before_discount" INTEGER NOT NULL DEFAULT 0,
    "assembly_value_after_discount" INTEGER NOT NULL DEFAULT 0,
    "net_value" INTEGER NOT NULL DEFAULT 0,
    "total_net" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "coefficient" REAL,
    "unit" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_materials_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "order_materials_order_id_idx" ON "order_materials"("order_id");

-- CreateIndex
CREATE INDEX "order_materials_category_idx" ON "order_materials"("category");
