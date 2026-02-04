-- Soft delete dla zleceń (Order)
-- Dodaje pola deleted_at i deleted_by_user_id

-- Dodanie kolumn soft delete
ALTER TABLE "orders" ADD COLUMN "deleted_at" DATETIME;
ALTER TABLE "orders" ADD COLUMN "deleted_by_user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL;

-- Indeks dla filtrowania usuniętych zleceń
CREATE INDEX "orders_deleted_at_idx" ON "orders"("deleted_at");
