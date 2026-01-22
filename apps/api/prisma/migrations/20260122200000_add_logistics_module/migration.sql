-- CreateTable: LogisticsMailList
-- Lista mailowa - reprezentuje jeden mail z listą projektów na dostawę
CREATE TABLE "logistics_mail_lists" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_date" DATETIME NOT NULL,
    "delivery_index" INTEGER NOT NULL,
    "delivery_code" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_update" BOOLEAN NOT NULL DEFAULT false,
    "raw_mail_text" TEXT NOT NULL,
    "parsed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME
);

-- CreateTable: LogisticsMailItem
-- Pozycja z maila - jeden projekt na liście
CREATE TABLE "logistics_mail_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mail_list_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "project_number" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "raw_notes" TEXT,
    "requires_mesh" BOOLEAN NOT NULL DEFAULT false,
    "missing_file" BOOLEAN NOT NULL DEFAULT false,
    "unconfirmed" BOOLEAN NOT NULL DEFAULT false,
    "dimensions_unconfirmed" BOOLEAN NOT NULL DEFAULT false,
    "drawing_unconfirmed" BOOLEAN NOT NULL DEFAULT false,
    "exclude_from_production" BOOLEAN NOT NULL DEFAULT false,
    "special_handle" BOOLEAN NOT NULL DEFAULT false,
    "custom_color" TEXT,
    "order_id" INTEGER,
    "item_status" TEXT NOT NULL DEFAULT 'ok',
    CONSTRAINT "logistics_mail_items_mail_list_id_fkey" FOREIGN KEY ("mail_list_id") REFERENCES "logistics_mail_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "logistics_mail_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex: Unique constraint for deliveryCode + version
CREATE UNIQUE INDEX "logistics_mail_lists_delivery_code_version_key" ON "logistics_mail_lists"("delivery_code", "version");

-- CreateIndex: Index for deliveryDate
CREATE INDEX "logistics_mail_lists_delivery_date_idx" ON "logistics_mail_lists"("delivery_date");

-- CreateIndex: Index for deliveryCode
CREATE INDEX "logistics_mail_lists_delivery_code_idx" ON "logistics_mail_lists"("delivery_code");

-- CreateIndex: Index for deletedAt (soft delete)
CREATE INDEX "logistics_mail_lists_deleted_at_idx" ON "logistics_mail_lists"("deleted_at");

-- CreateIndex: Index for mailListId
CREATE INDEX "logistics_mail_items_mail_list_id_idx" ON "logistics_mail_items"("mail_list_id");

-- CreateIndex: Index for projectNumber
CREATE INDEX "logistics_mail_items_project_number_idx" ON "logistics_mail_items"("project_number");

-- CreateIndex: Index for orderId
CREATE INDEX "logistics_mail_items_order_id_idx" ON "logistics_mail_items"("order_id");

-- CreateIndex: Index for itemStatus
CREATE INDEX "logistics_mail_items_item_status_idx" ON "logistics_mail_items"("item_status");
