-- CreateTable
CREATE TABLE "monthly_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "report_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_windows" INTEGER NOT NULL DEFAULT 0,
    "total_sashes" INTEGER NOT NULL DEFAULT 0,
    "total_value_pln" REAL NOT NULL DEFAULT 0,
    "total_value_eur" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "monthly_report_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "report_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "invoice_number" TEXT,
    "windows_count" INTEGER NOT NULL DEFAULT 0,
    "sashes_count" INTEGER NOT NULL DEFAULT 0,
    "units_count" INTEGER NOT NULL DEFAULT 0,
    "value_pln" REAL,
    "value_eur" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monthly_report_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "monthly_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "monthly_report_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "currency_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eur_to_pln_rate" REAL NOT NULL,
    "effective_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reports_year_month_key" ON "monthly_reports"("year", "month");

-- CreateIndex
CREATE INDEX "monthly_reports_year_month_idx" ON "monthly_reports"("year", "month");

-- CreateIndex
CREATE INDEX "monthly_reports_report_date_idx" ON "monthly_reports"("report_date");

-- CreateIndex
CREATE INDEX "monthly_report_items_report_id_idx" ON "monthly_report_items"("report_id");

-- CreateIndex
CREATE INDEX "monthly_report_items_order_id_idx" ON "monthly_report_items"("order_id");

-- CreateIndex
CREATE INDEX "currency_config_effective_date_idx" ON "currency_config"("effective_date");
