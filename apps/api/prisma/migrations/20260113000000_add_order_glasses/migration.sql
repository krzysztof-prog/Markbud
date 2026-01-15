-- CreateTable: Szyby przypisane do zlecenia (wstępna lista z pliku uzyte_bele)
CREATE TABLE "order_glasses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "lp" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "package_type" TEXT NOT NULL,
    "area_sqm" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_glasses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "order_glasses_order_id_idx" ON "order_glasses"("order_id");

-- CreateIndex
CREATE INDEX "order_glasses_position_idx" ON "order_glasses"("position");
