-- CreateTable
CREATE TABLE "loose_glasses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "glass_delivery_id" INTEGER NOT NULL,
    "customer_order_number" TEXT NOT NULL,
    "client_name" TEXT,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "glass_composition" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loose_glasses_glass_delivery_id_fkey" FOREIGN KEY ("glass_delivery_id") REFERENCES "glass_deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "aluminum_glasses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "glass_delivery_id" INTEGER NOT NULL,
    "customer_order_number" TEXT NOT NULL,
    "client_name" TEXT,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "glass_composition" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "aluminum_glasses_glass_delivery_id_fkey" FOREIGN KEY ("glass_delivery_id") REFERENCES "glass_deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reclamation_glasses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "glass_delivery_id" INTEGER NOT NULL,
    "customer_order_number" TEXT NOT NULL,
    "client_name" TEXT,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "glass_composition" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reclamation_glasses_glass_delivery_id_fkey" FOREIGN KEY ("glass_delivery_id") REFERENCES "glass_deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "loose_glasses_customer_order_number_idx" ON "loose_glasses"("customer_order_number");

-- CreateIndex
CREATE INDEX "loose_glasses_client_name_idx" ON "loose_glasses"("client_name");

-- CreateIndex
CREATE INDEX "loose_glasses_order_number_idx" ON "loose_glasses"("order_number");

-- CreateIndex
CREATE INDEX "loose_glasses_glass_delivery_id_idx" ON "loose_glasses"("glass_delivery_id");

-- CreateIndex
CREATE INDEX "aluminum_glasses_customer_order_number_idx" ON "aluminum_glasses"("customer_order_number");

-- CreateIndex
CREATE INDEX "aluminum_glasses_client_name_idx" ON "aluminum_glasses"("client_name");

-- CreateIndex
CREATE INDEX "aluminum_glasses_order_number_idx" ON "aluminum_glasses"("order_number");

-- CreateIndex
CREATE INDEX "aluminum_glasses_glass_delivery_id_idx" ON "aluminum_glasses"("glass_delivery_id");

-- CreateIndex
CREATE INDEX "reclamation_glasses_customer_order_number_idx" ON "reclamation_glasses"("customer_order_number");

-- CreateIndex
CREATE INDEX "reclamation_glasses_client_name_idx" ON "reclamation_glasses"("client_name");

-- CreateIndex
CREATE INDEX "reclamation_glasses_order_number_idx" ON "reclamation_glasses"("order_number");

-- CreateIndex
CREATE INDEX "reclamation_glasses_glass_delivery_id_idx" ON "reclamation_glasses"("glass_delivery_id");
