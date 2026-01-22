-- Dodanie pól zastępstw artykułów do tabeli okuc_articles
-- Migracja: add_article_replacement

-- Dodanie nowych kolumn
ALTER TABLE "okuc_articles" ADD COLUMN "is_phase_out" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "okuc_articles" ADD COLUMN "replaced_by_article_id" INTEGER REFERENCES "okuc_articles"("id") ON DELETE SET NULL;
ALTER TABLE "okuc_articles" ADD COLUMN "demand_transferred_at" DATETIME;

-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX "okuc_articles_is_phase_out_idx" ON "okuc_articles"("is_phase_out");
CREATE INDEX "okuc_articles_replaced_by_article_id_idx" ON "okuc_articles"("replaced_by_article_id");
