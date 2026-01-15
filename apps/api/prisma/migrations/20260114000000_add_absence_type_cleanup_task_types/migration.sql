-- Migracja: Dodanie absenceType do TimeEntry + usunięcie shortName/isPaid z NonProductiveTaskType
-- Data: 2026-01-14

-- 1. Dodaj pole absenceType do TimeEntry (Choroba, Urlop, Nieobecność)
ALTER TABLE "time_entries" ADD COLUMN "absence_type" TEXT;

-- 2. Usuń kolumnę shortName z NonProductiveTaskType
-- Najpierw tworzymy nową tabelę bez tej kolumny
CREATE TABLE "non_productive_task_types_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- 3. Kopiuj dane (bez shortName i isPaid)
INSERT INTO "non_productive_task_types_new" ("id", "name", "sort_order", "is_active", "created_at", "updated_at")
SELECT "id", "name", "sort_order", "is_active", "created_at", "updated_at"
FROM "non_productive_task_types";

-- 4. Usuń starą tabelę
DROP TABLE "non_productive_task_types";

-- 5. Zmień nazwę nowej tabeli
ALTER TABLE "non_productive_task_types_new" RENAME TO "non_productive_task_types";

-- 6. Odtwórz indeksy i constraint UNIQUE
CREATE UNIQUE INDEX "non_productive_task_types_name_key" ON "non_productive_task_types"("name");
CREATE INDEX "non_productive_task_types_is_active_idx" ON "non_productive_task_types"("is_active");
CREATE INDEX "non_productive_task_types_sort_order_idx" ON "non_productive_task_types"("sort_order");

-- 7. Dodaj indeks dla absenceType
CREATE INDEX "time_entries_absence_type_idx" ON "time_entries"("absence_type");
