-- Planowanie produkcji - dodane 2026-01-15
-- Dodanie pól do Profile i Color oraz nowe tabele konfiguracyjne

-- AlterTable: profiles - dodaj pola planowania produkcji
ALTER TABLE "profiles" ADD COLUMN "profile_type" TEXT NOT NULL DEFAULT 'typical';
ALTER TABLE "profiles" ADD COLUMN "is_palletized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "efficiency_coeff" DECIMAL;

-- AlterTable: colors - dodaj pole isTypical
ALTER TABLE "colors" ADD COLUMN "is_typical" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: production_efficiency_configs
CREATE TABLE "production_efficiency_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "glazings_per_hour" DECIMAL NOT NULL,
    "wings_per_hour" DECIMAL NOT NULL,
    "coefficient" DECIMAL NOT NULL DEFAULT 1.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "production_efficiency_configs_client_type_key" ON "production_efficiency_configs"("client_type");

-- CreateTable: production_calendar
CREATE TABLE "production_calendar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "day_type" TEXT NOT NULL,
    "description" TEXT,
    "max_hours" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "production_calendar_date_key" ON "production_calendar"("date");

-- CreateTable: production_settings
CREATE TABLE "production_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "production_settings_key_key" ON "production_settings"("key");

-- Seed: domyślne typy klientów
INSERT INTO "production_efficiency_configs" ("client_type", "name", "glazings_per_hour", "wings_per_hour", "coefficient", "sort_order", "created_at", "updated_at")
VALUES
    ('akrobud', 'Akrobud', 9.375, 6.25, 1.0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ct', 'CT', 9.375, 6.25, 1.0, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('living', 'Living', 7.5, 5.0, 0.8, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('other', 'Inne', 9.375, 6.25, 1.0, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed: domyślne parametry planowania
INSERT INTO "production_settings" ("key", "value", "description", "created_at", "updated_at")
VALUES
    ('base_hours_per_day', '8', 'Bazowa liczba godzin pracy dziennie', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('max_hours_mon_thu', '10', 'Max godzin Pn-Czw (z nadgodzinami)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('max_hours_fri', '8', 'Max godzin w piątek', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('max_hours_sat', '8', 'Max godzin w sobotę produkcyjną', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('glass_buffer_days', '9', 'Bufor dni dla szyb standardowych', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('akrobud_ready_before_days', '2', 'Dni gotowości przed dostawą Akrobud', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('individual_buffer_days', '5', 'Min dni bufora dla zleceń indywidualnych', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('glass_delivery_days', '["monday","wednesday","friday"]', 'Dni dostaw szyb (JSON array)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lead_time_calculation', 'max', 'Metoda obliczania lead time: min/avg/max/p90', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
