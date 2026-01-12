-- P0-R2: Add pallet optimization tables and validation status fields

-- CreateTable: pallet_optimizations
CREATE TABLE IF NOT EXISTS "pallet_optimizations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_id" INTEGER NOT NULL,
    "total_pallets" INTEGER NOT NULL,
    "optimization_data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "validation_status" TEXT DEFAULT 'pending',
    "validated_at" DATETIME,
    "validation_errors" TEXT,
    CONSTRAINT "pallet_optimizations_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: optimized_pallets
CREATE TABLE IF NOT EXISTS "optimized_pallets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "optimization_id" INTEGER NOT NULL,
    "pallet_number" INTEGER NOT NULL,
    "pallet_type_name" TEXT NOT NULL,
    "pallet_width" INTEGER NOT NULL,
    "used_depth_mm" INTEGER NOT NULL,
    "max_depth_mm" INTEGER NOT NULL,
    "utilization_percent" REAL NOT NULL,
    "windows_data" TEXT NOT NULL,
    CONSTRAINT "optimized_pallets_optimization_id_fkey" FOREIGN KEY ("optimization_id") REFERENCES "pallet_optimizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pallet_optimizations_delivery_id_key" ON "pallet_optimizations"("delivery_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "optimized_pallets_optimization_id_idx" ON "optimized_pallets"("optimization_id");
