-- CreateTable: DeliveryReadiness
-- Agregowany status gotowości dostawy z wszystkich modułów sprawdzających
CREATE TABLE "delivery_readiness" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_id" INTEGER NOT NULL,
    "aggregated_status" TEXT NOT NULL DEFAULT 'pending',
    "last_calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocking_count" INTEGER NOT NULL DEFAULT 0,
    "warning_count" INTEGER NOT NULL DEFAULT 0,
    "module_results" TEXT,
    "blocking_reasons" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "delivery_readiness_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_readiness_delivery_id_key" ON "delivery_readiness"("delivery_id");

-- CreateIndex
CREATE INDEX "delivery_readiness_aggregated_status_idx" ON "delivery_readiness"("aggregated_status");

-- CreateIndex
CREATE INDEX "delivery_readiness_last_calculated_at_idx" ON "delivery_readiness"("last_calculated_at");

-- AlterTable: LogisticsMailList - dodaj delivery_id
ALTER TABLE "logistics_mail_lists" ADD COLUMN "delivery_id" INTEGER;

-- CreateIndex: LogisticsMailList.delivery_id
CREATE INDEX "logistics_mail_lists_delivery_id_idx" ON "logistics_mail_lists"("delivery_id");

-- AddForeignKey: LogisticsMailList -> Delivery
-- SQLite nie wspiera ADD CONSTRAINT, więc relacja będzie działać przez Prisma Client
