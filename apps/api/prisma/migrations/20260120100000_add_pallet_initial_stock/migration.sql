-- CreateTable: Stan początkowy palet
CREATE TABLE "pallet_initial_stocks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "start_date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "initial_stock" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,
    "updated_by_id" INTEGER,
    CONSTRAINT "pallet_initial_stocks_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex: Unique constraint dla typu palety
CREATE UNIQUE INDEX "pallet_initial_stocks_type_key" ON "pallet_initial_stocks"("type");
