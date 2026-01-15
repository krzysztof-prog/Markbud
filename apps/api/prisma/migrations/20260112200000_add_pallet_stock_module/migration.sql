-- CreateTable: Dzień paletowy
CREATE TABLE "pallet_stock_days" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable: Wpis dla typu palety w danym dniu
CREATE TABLE "pallet_stock_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pallet_day_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "morning_stock" INTEGER NOT NULL DEFAULT 0,
    "morning_corrected" BOOLEAN NOT NULL DEFAULT false,
    "morning_note" TEXT,
    "used" INTEGER NOT NULL DEFAULT 0,
    "produced" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pallet_stock_entries_pallet_day_id_fkey" FOREIGN KEY ("pallet_day_id") REFERENCES "pallet_stock_days" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: Konfiguracja alertów
CREATE TABLE "pallet_alert_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "critical_threshold" INTEGER NOT NULL DEFAULT 10,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex: Unique date per day
CREATE UNIQUE INDEX "pallet_stock_days_date_key" ON "pallet_stock_days"("date");

-- CreateIndex: Index on date
CREATE INDEX "pallet_stock_days_date_idx" ON "pallet_stock_days"("date");

-- CreateIndex: Index on status
CREATE INDEX "pallet_stock_days_status_idx" ON "pallet_stock_days"("status");

-- CreateIndex: Unique entry per day per type
CREATE UNIQUE INDEX "pallet_stock_entries_pallet_day_id_type_key" ON "pallet_stock_entries"("pallet_day_id", "type");

-- CreateIndex: Index on type
CREATE INDEX "pallet_stock_entries_type_idx" ON "pallet_stock_entries"("type");

-- CreateIndex: Unique alert config per type
CREATE UNIQUE INDEX "pallet_alert_configs_type_key" ON "pallet_alert_configs"("type");

-- Insert default alert configs (próg = 10 dla wszystkich typów)
INSERT INTO "pallet_alert_configs" ("type", "critical_threshold", "updated_at") VALUES
    ('MALA', 10, CURRENT_TIMESTAMP),
    ('P2400', 10, CURRENT_TIMESTAMP),
    ('P3000', 10, CURRENT_TIMESTAMP),
    ('P3500', 10, CURRENT_TIMESTAMP),
    ('P4000', 10, CURRENT_TIMESTAMP);
