-- CreateTable
CREATE TABLE "user_folder_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "imports_base_path" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_folder_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "import_locks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "folder_path" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "locked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "process_id" TEXT,
    CONSTRAINT "import_locks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_folder_settings_user_id_key" ON "user_folder_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_folder_settings_user_id_is_active_idx" ON "user_folder_settings"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "import_locks_folder_path_key" ON "import_locks"("folder_path");

-- CreateIndex
CREATE INDEX "import_locks_expires_at_idx" ON "import_locks"("expires_at");

-- CreateIndex
CREATE INDEX "import_locks_user_id_idx" ON "import_locks"("user_id");
