-- CreateTable
CREATE TABLE "gmail_fetch_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "message_uid" TEXT NOT NULL,
    "subject" TEXT,
    "sender" TEXT,
    "received_at" DATETIME,
    "attachment_name" TEXT,
    "saved_file_path" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "gmail_fetch_logs_message_uid_key" ON "gmail_fetch_logs"("message_uid");

-- CreateIndex
CREATE INDEX "gmail_fetch_logs_status_idx" ON "gmail_fetch_logs"("status");

-- CreateIndex
CREATE INDEX "gmail_fetch_logs_created_at_idx" ON "gmail_fetch_logs"("created_at");
