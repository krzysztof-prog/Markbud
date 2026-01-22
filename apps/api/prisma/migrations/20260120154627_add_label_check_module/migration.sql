-- CreateTable
CREATE TABLE "label_checks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_id" INTEGER NOT NULL,
    "delivery_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "checked_count" INTEGER NOT NULL DEFAULT 0,
    "ok_count" INTEGER NOT NULL DEFAULT 0,
    "mismatch_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "deleted_at" DATETIME,
    CONSTRAINT "label_checks_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "label_check_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label_check_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expected_date" DATETIME NOT NULL,
    "detected_date" DATETIME,
    "detected_text" TEXT,
    "image_path" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "label_check_results_label_check_id_fkey" FOREIGN KEY ("label_check_id") REFERENCES "label_checks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "label_checks_delivery_id_idx" ON "label_checks"("delivery_id");

-- CreateIndex
CREATE INDEX "label_checks_status_idx" ON "label_checks"("status");

-- CreateIndex
CREATE INDEX "label_checks_created_at_idx" ON "label_checks"("created_at");

-- CreateIndex
CREATE INDEX "label_checks_deleted_at_idx" ON "label_checks"("deleted_at");

-- CreateIndex
CREATE INDEX "label_check_results_label_check_id_idx" ON "label_check_results"("label_check_id");

-- CreateIndex
CREATE INDEX "label_check_results_order_id_idx" ON "label_check_results"("order_id");

-- CreateIndex
CREATE INDEX "label_check_results_status_idx" ON "label_check_results"("status");
