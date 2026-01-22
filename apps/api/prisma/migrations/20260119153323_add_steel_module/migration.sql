-- CreateTable
CREATE TABLE "steels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" TEXT NOT NULL,
    "article_number" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "steel_stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "steel_id" INTEGER NOT NULL,
    "current_stock_beams" INTEGER NOT NULL DEFAULT 0,
    "initial_stock_beams" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" DATETIME,
    "updated_at" DATETIME NOT NULL,
    "updated_by_id" INTEGER,
    CONSTRAINT "steel_stock_steel_id_fkey" FOREIGN KEY ("steel_id") REFERENCES "steels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "steel_stock_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "steel_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "steel_id" INTEGER NOT NULL,
    "ordered_beams" INTEGER NOT NULL,
    "expected_delivery_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,
    CONSTRAINT "steel_orders_steel_id_fkey" FOREIGN KEY ("steel_id") REFERENCES "steels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "steel_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "steel_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "steel_id" INTEGER NOT NULL,
    "calculated_stock" INTEGER NOT NULL,
    "actual_stock" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "previous_stock" INTEGER,
    "current_stock" INTEGER,
    "change_type" TEXT,
    "notes" TEXT,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" INTEGER,
    CONSTRAINT "steel_history_steel_id_fkey" FOREIGN KEY ("steel_id") REFERENCES "steels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "steel_history_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_steel_requirements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "steel_id" INTEGER NOT NULL,
    "beams_count" INTEGER NOT NULL,
    "meters" REAL NOT NULL,
    "rest_mm" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_steel_requirements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_steel_requirements_steel_id_fkey" FOREIGN KEY ("steel_id") REFERENCES "steels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "steels_number_key" ON "steels"("number");

-- CreateIndex
CREATE UNIQUE INDEX "steels_article_number_key" ON "steels"("article_number");

-- CreateIndex
CREATE UNIQUE INDEX "steel_stock_steel_id_key" ON "steel_stock"("steel_id");

-- CreateIndex
CREATE INDEX "steel_stock_deleted_at_idx" ON "steel_stock"("deleted_at");

-- CreateIndex
CREATE INDEX "steel_orders_status_idx" ON "steel_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "steel_orders_steel_id_expected_delivery_date_key" ON "steel_orders"("steel_id", "expected_delivery_date");

-- CreateIndex
CREATE INDEX "steel_history_steel_id_idx" ON "steel_history"("steel_id");

-- CreateIndex
CREATE INDEX "steel_history_recorded_at_idx" ON "steel_history"("recorded_at");

-- CreateIndex
CREATE INDEX "order_steel_requirements_steel_id_idx" ON "order_steel_requirements"("steel_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_steel_requirements_order_id_steel_id_key" ON "order_steel_requirements"("order_id", "steel_id");

-- Dane początkowe: 43 pozycje stali
INSERT INTO "steels" ("number", "article_number", "name", "sort_order", "updated_at") VALUES
('201202', '20120200', 'Wzmocnienie 1.5 do ramy 8864 nieużywane', 1, CURRENT_TIMESTAMP),
('201210', '20121000', 'Wzmocnienie 2mm do 18848', 2, CURRENT_TIMESTAMP),
('201292', '20129200', 'Wzmocnienie 1.5', 3, CURRENT_TIMESTAMP),
('202446', '20244600', 'Wzmocnienie 1,5mm', 4, CURRENT_TIMESTAMP),
('202588', '20258800', 'Wzmocnienie', 5, CURRENT_TIMESTAMP),
('202609', '20260900', 'Wzmocnienie', 6, CURRENT_TIMESTAMP),
('202610', '20261000', 'Wzmocnienie', 7, CURRENT_TIMESTAMP),
('202617', '20261700', 'WZM - SZER. SKRZ. CT70', 8, CURRENT_TIMESTAMP),
('202618', '20261800', 'Wzmocnienie', 9, CURRENT_TIMESTAMP),
('202623', '20262300', 'Wzmocnienie', 10, CURRENT_TIMESTAMP),
('202628', '20262800', 'Wzmocnienie 2 mm', 11, CURRENT_TIMESTAMP),
('202629', '20262900', 'Wzmocnienie 3mm', 12, CURRENT_TIMESTAMP),
('202695', '20269500', 'Wzmocnienie 2mm RURA 9831', 13, CURRENT_TIMESTAMP),
('202717', '20271700', 'Wzmocnienie 1,5 mm', 14, CURRENT_TIMESTAMP),
('202718', '20271800', 'Wzmocnienie 2,5 mm nieużywane', 15, CURRENT_TIMESTAMP),
('202719', '20271900', 'Wzmocnienie 1,5 mm', 16, CURRENT_TIMESTAMP),
('202720', '20272000', 'Wzmocnienie 2,5 mm', 17, CURRENT_TIMESTAMP),
('202725', '20272500', 'Wzmocnienie 1,5 mm', 18, CURRENT_TIMESTAMP),
('202726', '20272600', 'Wzmocnienie 2 mm', 19, CURRENT_TIMESTAMP),
('202727', '20272700', 'Wzmocnienie 2,5 mm', 20, CURRENT_TIMESTAMP),
('202728', '20272800', 'Wzmocnienie 2,5 mm', 21, CURRENT_TIMESTAMP),
('202729', '20272900', 'Wzmocnienie 1,5 mm', 22, CURRENT_TIMESTAMP),
('202730', '20273000', 'Wzmocnienie 2 mm', 23, CURRENT_TIMESTAMP),
('202733', '20273300', 'Wzmocnienie 2 mm', 24, CURRENT_TIMESTAMP),
('202737', '20273700', 'Wzmocnienie 1,5 mm', 25, CURRENT_TIMESTAMP),
('202738', '20273800', 'Wzmocnienie 2 mm', 26, CURRENT_TIMESTAMP),
('202740', '20274000', 'Wzmocnienie 3 mm', 27, CURRENT_TIMESTAMP),
('202742', '20274200', 'Wzmocnienie 2,5 mm', 28, CURRENT_TIMESTAMP),
('202743', '20274300', 'Wzmocnienie 2 mm', 29, CURRENT_TIMESTAMP),
('202752', '20275200', 'Wzmocnienie', 30, CURRENT_TIMESTAMP),
('202745', '20274500', 'wzmocnienie do ramy 9491 (drzw)', 31, CURRENT_TIMESTAMP),
('201717', '20171700', 'x2 .Wzmocnienie 1,5 mm', 32, CURRENT_TIMESTAMP),
('201034', '20103400', 'WZMOCNIEE', 33, CURRENT_TIMESTAMP),
('202208', '20220800', 'Wzmocnienie 1,5mm', 34, CURRENT_TIMESTAMP),
('202713', '20271300', 'stal do skrzydła nordic', 35, CURRENT_TIMESTAMP),
('202714', '20271400', 'stal do słupka nordic', 36, CURRENT_TIMESTAMP),
('202859', '20285900', 'wzmocnienie do słupka', 37, CURRENT_TIMESTAMP),
('202891', '20289100', 'Wzmocnienie do skrzydła Livingslide', 38, CURRENT_TIMESTAMP),
('202945', '20294500', 'STAL DO SKRZYDŁA MOVE', 39, CURRENT_TIMESTAMP),
('202731', '20273100', 'Wzmocnienie 2,5mm', 40, CURRENT_TIMESTAMP),
('202784', '20278400', 'wzmocnienie 1.5 do ramy 8864', 41, CURRENT_TIMESTAMP),
('202965', '20296500', 'Wzmocniee stal do sztulp focusing', 42, CURRENT_TIMESTAMP),
('202855', '20285500', 'wzmocnienie do słupka', 43, CURRENT_TIMESTAMP);

-- Tworzenie rekordów SteelStock dla każdej stali (z początkowym stanem 0)
INSERT INTO "steel_stock" ("steel_id", "current_stock_beams", "initial_stock_beams", "version", "updated_at")
SELECT id, 0, 0, 0, CURRENT_TIMESTAMP FROM "steels";
