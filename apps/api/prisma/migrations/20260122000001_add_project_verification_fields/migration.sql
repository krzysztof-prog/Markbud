-- Migration: add_project_verification_fields
-- Dodaje wersjonowanie list weryfikacyjnych i obsługę projektów

-- AlterTable: AkrobudVerificationList - dodaj wersjonowanie
ALTER TABLE "akrobud_verification_lists" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "akrobud_verification_lists" ADD COLUMN "parent_id" INTEGER;
ALTER TABLE "akrobud_verification_lists" ADD COLUMN "raw_input" TEXT;
ALTER TABLE "akrobud_verification_lists" ADD COLUMN "suggested_date" DATETIME;

-- AlterTable: AkrobudVerificationItem - dodaj pole projectNumber
ALTER TABLE "akrobud_verification_items" ADD COLUMN "project_number" TEXT;

-- CreateTable: VerificationItemOrder
CREATE TABLE "verification_item_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "item_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    CONSTRAINT "verification_item_orders_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "akrobud_verification_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "verification_item_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "akrobud_verification_lists_parent_id_idx" ON "akrobud_verification_lists"("parent_id");
CREATE INDEX "akrobud_verification_lists_version_idx" ON "akrobud_verification_lists"("version");
CREATE INDEX "akrobud_verification_items_project_number_idx" ON "akrobud_verification_items"("project_number");
CREATE UNIQUE INDEX "verification_item_orders_item_id_order_id_key" ON "verification_item_orders"("item_id", "order_id");
CREATE INDEX "verification_item_orders_item_id_idx" ON "verification_item_orders"("item_id");
CREATE INDEX "verification_item_orders_order_id_idx" ON "verification_item_orders"("order_id");
