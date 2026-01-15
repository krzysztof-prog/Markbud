-- Add soft delete field to file_imports table
-- Instead of permanently deleting imports, we'll mark them with a deletedAt timestamp

-- Add the deletedAt column
ALTER TABLE "file_imports" ADD COLUMN "deleted_at" DATETIME;

-- Create index for efficient filtering of non-deleted imports
CREATE INDEX "file_imports_deleted_at_idx" ON "file_imports"("deleted_at");
