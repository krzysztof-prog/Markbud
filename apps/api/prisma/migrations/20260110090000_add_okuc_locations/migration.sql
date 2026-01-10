-- CreateTable
CREATE TABLE "okuc_locations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- AlterTable
ALTER TABLE "okuc_articles" ADD COLUMN "location_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "okuc_locations_name_key" ON "okuc_locations"("name");

-- CreateIndex
CREATE INDEX "okuc_locations_deleted_at_idx" ON "okuc_locations"("deleted_at");

-- CreateIndex
CREATE INDEX "okuc_locations_sort_order_idx" ON "okuc_locations"("sort_order");

-- CreateIndex
CREATE INDEX "okuc_articles_location_id_idx" ON "okuc_articles"("location_id");

-- Insert default locations
INSERT INTO "okuc_locations" ("name", "sort_order", "updated_at") VALUES
('Schuco', 1, CURRENT_TIMESTAMP),
('Namiot', 2, CURRENT_TIMESTAMP),
('Hala skrzydła', 3, CURRENT_TIMESTAMP),
('Hala rama', 4, CURRENT_TIMESTAMP),
('Pod zlecenie', 5, CURRENT_TIMESTAMP);
