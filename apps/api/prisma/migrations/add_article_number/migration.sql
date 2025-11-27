-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "article_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "profiles_article_number_key" ON "profiles"("article_number");
