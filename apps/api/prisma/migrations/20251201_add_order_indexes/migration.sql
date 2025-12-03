-- CreateIndex
CREATE INDEX "orders_invoice_number_created_at_idx" ON "orders"("invoice_number", "created_at");

-- CreateIndex
CREATE INDEX "orders_invoice_number_delivery_date_idx" ON "orders"("invoice_number", "delivery_date");
