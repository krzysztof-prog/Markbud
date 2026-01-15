-- CreateTable: document_author_mappings
CREATE TABLE "document_author_mappings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "author_name" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "document_author_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "document_author_mappings_author_name_key" ON "document_author_mappings"("author_name");

-- AlterTable: orders - add document_author and document_author_user_id
ALTER TABLE "orders" ADD COLUMN "document_author" TEXT;
ALTER TABLE "orders" ADD COLUMN "document_author_user_id" INTEGER;

-- CreateIndex on orders.document_author_user_id for performance
CREATE INDEX "orders_document_author_user_id_idx" ON "orders"("document_author_user_id");
