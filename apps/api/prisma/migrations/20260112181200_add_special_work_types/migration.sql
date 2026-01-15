-- CreateTable: SpecialWorkType (Typ nietypówki - słownik)
CREATE TABLE "special_work_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable: SpecialWork (Nietypówka powiązana z TimeEntry)
CREATE TABLE "special_works" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time_entry_id" INTEGER NOT NULL,
    "special_type_id" INTEGER NOT NULL,
    "hours" REAL NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "special_works_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "special_works_special_type_id_fkey" FOREIGN KEY ("special_type_id") REFERENCES "special_work_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "special_work_types_name_key" ON "special_work_types"("name");

-- CreateIndex
CREATE INDEX "special_work_types_is_active_idx" ON "special_work_types"("is_active");

-- CreateIndex
CREATE INDEX "special_work_types_sort_order_idx" ON "special_work_types"("sort_order");

-- CreateIndex
CREATE INDEX "special_works_time_entry_id_idx" ON "special_works"("time_entry_id");

-- CreateIndex
CREATE INDEX "special_works_special_type_id_idx" ON "special_works"("special_type_id");

-- Seed: Dodaj domyślne typy nietypówek
INSERT INTO "special_work_types" ("name", "short_name", "sort_order", "is_active", "updated_at") VALUES
('Drzwi', 'Drzwi', 1, 1, CURRENT_TIMESTAMP),
('HS', 'HS', 2, 1, CURRENT_TIMESTAMP),
('PSK', 'PSK', 3, 1, CURRENT_TIMESTAMP),
('Szprosy', 'Szpr', 4, 1, CURRENT_TIMESTAMP),
('Trapez', 'Trap', 5, 1, CURRENT_TIMESTAMP),
('Łuki', 'Łuki', 6, 1, CURRENT_TIMESTAMP);
