-- CreateTable
CREATE TABLE "akrobud_verification_lists" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_date" DATETIME NOT NULL,
    "delivery_id" INTEGER,
    "title" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "akrobud_verification_lists_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "akrobud_verification_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "list_id" INTEGER NOT NULL,
    "order_number_input" TEXT NOT NULL,
    "order_number_base" TEXT,
    "order_number_suffix" TEXT,
    "matched_order_id" INTEGER,
    "match_status" TEXT NOT NULL DEFAULT 'pending',
    "position" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "akrobud_verification_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "akrobud_verification_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "akrobud_verification_items_matched_order_id_fkey" FOREIGN KEY ("matched_order_id") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "akrobud_verification_lists_delivery_date_idx" ON "akrobud_verification_lists"("delivery_date");

-- CreateIndex
CREATE INDEX "akrobud_verification_lists_deleted_at_idx" ON "akrobud_verification_lists"("deleted_at");

-- CreateIndex
CREATE INDEX "akrobud_verification_lists_status_idx" ON "akrobud_verification_lists"("status");

-- CreateIndex
CREATE UNIQUE INDEX "akrobud_verification_items_list_id_order_number_input_key" ON "akrobud_verification_items"("list_id", "order_number_input");

-- CreateIndex
CREATE INDEX "akrobud_verification_items_list_id_idx" ON "akrobud_verification_items"("list_id");

-- CreateIndex
CREATE INDEX "akrobud_verification_items_match_status_idx" ON "akrobud_verification_items"("match_status");
