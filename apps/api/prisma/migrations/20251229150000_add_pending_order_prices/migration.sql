-- CreateTable
CREATE TABLE "pending_order_prices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_number" TEXT NOT NULL,
    "reference" TEXT,
    "currency" TEXT NOT NULL,
    "value_netto" REAL NOT NULL,
    "value_brutto" REAL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "import_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "applied_at" DATETIME,
    "applied_to_order_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pending_order_prices_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "file_imports" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "pending_order_prices_order_number_idx" ON "pending_order_prices"("order_number");

-- CreateIndex
CREATE INDEX "pending_order_prices_status_idx" ON "pending_order_prices"("status");

-- CreateIndex
CREATE INDEX "pending_order_prices_order_number_status_idx" ON "pending_order_prices"("order_number", "status");
