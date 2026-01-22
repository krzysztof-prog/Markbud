-- CreateTable
CREATE TABLE "private_colors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "private_colors_code_key" ON "private_colors"("code");

-- AlterTable - Add privateColorId column to order_requirements
-- SQLite nie pozwala na ALTER COLUMN, więc musimy zmodyfikować tabelę
-- colorId jest już nullable w SQLite (może być NULL)

-- Add private_color_id column
ALTER TABLE "order_requirements" ADD COLUMN "private_color_id" INTEGER REFERENCES "private_colors"("id") ON DELETE RESTRICT;

-- CreateIndex for privateColorId
CREATE INDEX "order_requirements_private_color_id_idx" ON "order_requirements"("private_color_id");

-- CreateIndex for unique constraint on orderId + profileId + privateColorId
CREATE UNIQUE INDEX "order_requirements_order_id_profile_id_private_color_id_key" ON "order_requirements"("order_id", "profile_id", "private_color_id");
