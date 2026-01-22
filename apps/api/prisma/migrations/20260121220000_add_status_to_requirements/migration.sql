-- Dodanie pola status do OrderRequirement (zapotrzebowanie profili)
-- pending = nie przetworzono RW, completed = RW wykonane
ALTER TABLE "order_requirements" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
CREATE INDEX "order_requirements_status_idx" ON "order_requirements"("status");

-- Dodanie pola status do OrderSteelRequirement (zapotrzebowanie stali)
-- pending = nie przetworzono RW, completed = RW wykonane
ALTER TABLE "order_steel_requirements" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
CREATE INDEX "order_steel_requirements_status_idx" ON "order_steel_requirements"("status");
