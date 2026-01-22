-- Migration: Add priceEur to OkucArticle
-- Date: 2026-01-21
-- Description: Dodaje pole ceny w EUR (w eurocentach) do artykułów okuciowych

ALTER TABLE "okuc_articles" ADD COLUMN "price_eur" INTEGER;
