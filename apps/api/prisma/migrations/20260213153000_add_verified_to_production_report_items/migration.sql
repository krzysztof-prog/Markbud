-- AddVerifiedToProductionReportItems
-- Dodaje pole 'verified' do ProductionReportItem
-- Gdy true - zlecenie jest sprawdzone i zatwierdzone (blokuje edycję i import)

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_production_report_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "report_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "override_windows" INTEGER,
    "override_units" INTEGER,
    "override_sashes" INTEGER,
    "override_value_pln" INTEGER,
    "override_value_eur" INTEGER,
    "override_material_value" INTEGER,
    "rw_okucia" BOOLEAN NOT NULL DEFAULT 0,
    "rw_profile" BOOLEAN NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT 0,
    "invoice_number" TEXT,
    "invoice_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "production_report_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "production_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_report_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_production_report_items" ("id", "report_id", "order_id", "override_windows", "override_units", "override_sashes", "override_value_pln", "override_value_eur", "override_material_value", "rw_okucia", "rw_profile", "invoice_number", "invoice_date", "created_at", "updated_at") SELECT "id", "report_id", "order_id", "override_windows", "override_units", "override_sashes", "override_value_pln", "override_value_eur", "override_material_value", "rw_okucia", "rw_profile", "invoice_number", "invoice_date", "created_at", "updated_at" FROM "production_report_items";
DROP TABLE "production_report_items";
ALTER TABLE "new_production_report_items" RENAME TO "production_report_items";
CREATE UNIQUE INDEX "production_report_items_report_id_order_id_key" ON "production_report_items"("report_id", "order_id");
CREATE INDEX "production_report_items_report_id_idx" ON "production_report_items"("report_id");
CREATE INDEX "production_report_items_order_id_idx" ON "production_report_items"("order_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
