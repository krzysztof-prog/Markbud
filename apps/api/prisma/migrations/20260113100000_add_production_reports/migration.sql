-- Zestawienie Miesięczne Produkcji
-- Nowy system raportów miesięcznych oparty o productionDate (zastępuje stary MonthlyReport)

-- CreateTable: Główny raport miesięczny produkcji
CREATE TABLE "production_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closed_at" DATETIME,
    "closed_by_id" INTEGER,
    "edited_after_close" BOOLEAN NOT NULL DEFAULT false,
    "reopened_at" DATETIME,
    "reopened_by_id" INTEGER,
    "atypical_windows" INTEGER NOT NULL DEFAULT 0,
    "atypical_units" INTEGER NOT NULL DEFAULT 0,
    "atypical_sashes" INTEGER NOT NULL DEFAULT 0,
    "atypical_value_pln" INTEGER NOT NULL DEFAULT 0,
    "atypical_currency" TEXT NOT NULL DEFAULT 'PLN',
    "atypical_notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "production_reports_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "production_reports_reopened_by_id_fkey" FOREIGN KEY ("reopened_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: Pozycja raportu - nadpisane wartości dla zlecenia
CREATE TABLE "production_report_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "report_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "override_windows" INTEGER,
    "override_units" INTEGER,
    "override_sashes" INTEGER,
    "override_value_pln" INTEGER,
    "rw_okucia" BOOLEAN NOT NULL DEFAULT false,
    "rw_profile" BOOLEAN NOT NULL DEFAULT false,
    "invoice_number" TEXT,
    "invoice_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "production_report_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "production_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_report_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex: Unikalność rok+miesiąc
CREATE UNIQUE INDEX "production_reports_year_month_key" ON "production_reports"("year", "month");

-- CreateIndex: Indeks dla wyszukiwania po roku i miesiącu
CREATE INDEX "production_reports_year_month_idx" ON "production_reports"("year", "month");

-- CreateIndex: Indeks dla filtrowania po statusie
CREATE INDEX "production_reports_status_idx" ON "production_reports"("status");

-- CreateIndex: Unikalność pozycji (jeden wpis per zlecenie w raporcie)
CREATE UNIQUE INDEX "production_report_items_report_id_order_id_key" ON "production_report_items"("report_id", "order_id");

-- CreateIndex: Indeks dla relacji z raportem
CREATE INDEX "production_report_items_report_id_idx" ON "production_report_items"("report_id");

-- CreateIndex: Indeks dla relacji ze zleceniem
CREATE INDEX "production_report_items_order_id_idx" ON "production_report_items"("order_id");
