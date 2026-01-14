-- CreateTable
CREATE TABLE "pending_import_conflicts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_number" TEXT NOT NULL,
    "base_order_number" TEXT NOT NULL,
    "suffix" TEXT NOT NULL,
    "base_order_id" INTEGER NOT NULL,
    "document_author" TEXT,
    "author_user_id" INTEGER,
    "filepath" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "parsed_data" TEXT NOT NULL,
    "existing_windows_count" INTEGER,
    "existing_glass_count" INTEGER,
    "new_windows_count" INTEGER,
    "new_glass_count" INTEGER,
    "system_suggestion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "resolved_at" DATETIME,
    "resolved_by_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pending_import_conflicts_base_order_id_fkey" FOREIGN KEY ("base_order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pending_import_conflicts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pending_import_conflicts_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "pending_import_conflicts_status_idx" ON "pending_import_conflicts"("status");

-- CreateIndex
CREATE INDEX "pending_import_conflicts_author_user_id_idx" ON "pending_import_conflicts"("author_user_id");

-- CreateIndex
CREATE INDEX "pending_import_conflicts_base_order_id_idx" ON "pending_import_conflicts"("base_order_id");

-- CreateIndex
CREATE INDEX "pending_import_conflicts_created_at_idx" ON "pending_import_conflicts"("created_at");

-- CreateIndex
CREATE INDEX "pending_import_conflicts_status_author_user_id_idx" ON "pending_import_conflicts"("status", "author_user_id");
