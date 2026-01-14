-- AlterTable: Dodanie soft delete dla użytkowników
ALTER TABLE "users" ADD COLUMN "deleted_at" DATETIME;
