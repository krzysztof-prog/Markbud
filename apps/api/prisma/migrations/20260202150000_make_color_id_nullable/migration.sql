-- Migracja: Zmiana color_id na nullable w order_requirements
-- Problem: Schema.prisma definiuje colorId Int? (nullable), ale baza ma NOT NULL
-- Rozwiązanie: SQLite wymaga przebudowy tabeli aby zmienić constraint

-- Krok 1: Wyłącz foreign keys tymczasowo
PRAGMA foreign_keys=OFF;

-- Krok 2: Utwórz nową tabelę z prawidłową strukturą (color_id nullable)
CREATE TABLE "order_requirements_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER,  -- NULLABLE teraz!
    "private_color_id" INTEGER,
    "beams_count" INTEGER NOT NULL,
    "meters" REAL NOT NULL,
    "rest_mm" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_requirements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_requirements_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_requirements_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_requirements_private_color_id_fkey" FOREIGN KEY ("private_color_id") REFERENCES "private_colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Krok 3: Kopiuj dane ze starej tabeli
INSERT INTO "order_requirements_new" ("id", "order_id", "profile_id", "color_id", "private_color_id", "beams_count", "meters", "rest_mm", "status", "created_at")
SELECT "id", "order_id", "profile_id", "color_id", "private_color_id", "beams_count", "meters", "rest_mm", "status", "created_at"
FROM "order_requirements";

-- Krok 4: Usuń starą tabelę
DROP TABLE "order_requirements";

-- Krok 5: Zmień nazwę nowej tabeli
ALTER TABLE "order_requirements_new" RENAME TO "order_requirements";

-- Krok 6: Odtwórz indeksy
CREATE INDEX "order_requirements_color_id_idx" ON "order_requirements"("color_id");
CREATE INDEX "order_requirements_private_color_id_idx" ON "order_requirements"("private_color_id");
CREATE INDEX "order_requirements_profile_id_idx" ON "order_requirements"("profile_id");
CREATE INDEX "order_requirements_created_at_idx" ON "order_requirements"("created_at");
CREATE INDEX "order_requirements_status_idx" ON "order_requirements"("status");

-- Krok 7: Odtwórz unique constraints
CREATE UNIQUE INDEX "order_requirements_order_id_profile_id_color_id_key" ON "order_requirements"("order_id", "profile_id", "color_id");
CREATE UNIQUE INDEX "order_requirements_order_id_profile_id_private_color_id_key" ON "order_requirements"("order_id", "profile_id", "private_color_id");

-- Krok 8: Włącz foreign keys z powrotem
PRAGMA foreign_keys=ON;
