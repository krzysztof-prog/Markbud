-- CreateTable
CREATE TABLE "workers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "default_position" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "positions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "non_productive_task_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "position_id" INTEGER NOT NULL,
    "productive_hours" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "time_entries_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "time_entries_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "non_productive_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time_entry_id" INTEGER NOT NULL,
    "task_type_id" INTEGER NOT NULL,
    "hours" REAL NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "non_productive_tasks_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "non_productive_tasks_task_type_id_fkey" FOREIGN KEY ("task_type_id") REFERENCES "non_productive_task_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "workers_is_active_idx" ON "workers"("is_active");

-- CreateIndex
CREATE INDEX "workers_sort_order_idx" ON "workers"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "positions_name_key" ON "positions"("name");

-- CreateIndex
CREATE INDEX "positions_is_active_idx" ON "positions"("is_active");

-- CreateIndex
CREATE INDEX "positions_sort_order_idx" ON "positions"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "non_productive_task_types_name_key" ON "non_productive_task_types"("name");

-- CreateIndex
CREATE INDEX "non_productive_task_types_is_active_idx" ON "non_productive_task_types"("is_active");

-- CreateIndex
CREATE INDEX "non_productive_task_types_sort_order_idx" ON "non_productive_task_types"("sort_order");

-- CreateIndex
CREATE INDEX "time_entries_date_idx" ON "time_entries"("date");

-- CreateIndex
CREATE INDEX "time_entries_worker_id_idx" ON "time_entries"("worker_id");

-- CreateIndex
CREATE INDEX "time_entries_position_id_idx" ON "time_entries"("position_id");

-- CreateIndex
CREATE INDEX "time_entries_date_worker_id_idx" ON "time_entries"("date", "worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "time_entries_date_worker_id_key" ON "time_entries"("date", "worker_id");

-- CreateIndex
CREATE INDEX "non_productive_tasks_time_entry_id_idx" ON "non_productive_tasks"("time_entry_id");

-- CreateIndex
CREATE INDEX "non_productive_tasks_task_type_id_idx" ON "non_productive_tasks"("task_type_id");

-- Seed default positions
INSERT INTO "positions" ("name", "short_name", "sort_order", "is_active", "created_at", "updated_at") VALUES
('Cięcie', 'CIĘ', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Zbrojenie', 'ZBR', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Spawanie', 'SPA', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Szklenie', 'SZK', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Pakowanie', 'PAK', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed default non-productive task types
INSERT INTO "non_productive_task_types" ("name", "short_name", "is_paid", "sort_order", "is_active", "created_at", "updated_at") VALUES
('Urlop', 'URL', true, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('L4', 'L4', true, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Sprzątanie', 'SPR', true, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Szkolenie', 'SZK', true, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Inne', 'INN', true, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
