-- CreateTable
CREATE TABLE "schuco_fetch_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL DEFAULT 'manual',
    "records_count" INTEGER,
    "new_records" INTEGER,
    "updated_records" INTEGER,
    "unchanged_records" INTEGER,
    "error_message" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "duration_ms" INTEGER
);

-- CreateIndex
CREATE INDEX "schuco_fetch_logs_status_idx" ON "schuco_fetch_logs"("status");

-- CreateIndex
CREATE INDEX "schuco_fetch_logs_started_at_idx" ON "schuco_fetch_logs"("started_at");
