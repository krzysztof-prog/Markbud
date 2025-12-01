-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" TEXT NOT NULL,
    "article_number" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "colors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hex_color" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "profile_colors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "profile_colors_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "profile_colors_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "value_pln" REAL,
    "value_eur" REAL,
    "invoice_number" TEXT,
    "delivery_date" DATETIME,
    "production_date" DATETIME,
    "glass_delivery_date" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "archived_at" DATETIME,
    "total_windows" INTEGER,
    "total_sashes" INTEGER,
    "total_glasses" INTEGER
);

-- CreateTable
CREATE TABLE "order_requirements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "beams_count" INTEGER NOT NULL,
    "meters" REAL NOT NULL,
    "rest_mm" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_requirements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_requirements_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_requirements_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_windows" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "profile_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_windows_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse_stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "current_stock_beams" INTEGER NOT NULL DEFAULT 0,
    "ordered_beams" INTEGER,
    "expected_delivery_date" DATETIME,
    "updated_at" DATETIME NOT NULL,
    "updated_by_id" INTEGER,
    CONSTRAINT "warehouse_stock_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_stock_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_stock_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "ordered_beams" INTEGER NOT NULL,
    "expected_delivery_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,
    CONSTRAINT "warehouse_orders_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_orders_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "calculated_stock" INTEGER NOT NULL,
    "actual_stock" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" INTEGER,
    CONSTRAINT "warehouse_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_history_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_history_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_date" DATETIME NOT NULL,
    "delivery_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "total_windows" INTEGER,
    "total_glass" INTEGER,
    "total_pallets" INTEGER,
    "total_value" REAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "delivery_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "delivery_orders_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "delivery_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "delivery_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_id" INTEGER NOT NULL,
    "item_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_items_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pallet_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "length_mm" INTEGER NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "load_width_mm" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "packing_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "rule_config" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "file_imports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_at" DATETIME,
    "error_message" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "working_days" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "is_working" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "is_holiday" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "okuc_articles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT NOT NULL DEFAULT 'UCHWYTY',
    "warehouse" TEXT,
    "price" REAL DEFAULT 0,
    "priceHistory" TEXT,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "max_stock" INTEGER NOT NULL DEFAULT 100,
    "avg_monthly_usage" REAL NOT NULL DEFAULT 0,
    "proportion" REAL NOT NULL DEFAULT 1.0,
    "do_not_order" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "order_type" TEXT NOT NULL DEFAULT 'Po RW',
    "package_size" REAL NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "alternativeNumbers" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "okuc_stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article_id" INTEGER NOT NULL,
    "current_quantity" INTEGER NOT NULL DEFAULT 0,
    "ordered_quantity" INTEGER,
    "expected_delivery_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "updated_at" DATETIME NOT NULL,
    "updated_by_id" INTEGER,
    CONSTRAINT "okuc_stock_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "okuc_stock_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "okuc_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article_id" INTEGER NOT NULL,
    "ordered_quantity" INTEGER NOT NULL,
    "expected_delivery_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,
    CONSTRAINT "okuc_orders_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "okuc_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "okuc_requirements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article_id" INTEGER NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "source_group" TEXT,
    "source_file" TEXT,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" INTEGER,
    CONSTRAINT "okuc_requirements_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "okuc_requirements_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "okuc_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article_id" INTEGER NOT NULL,
    "calculated_stock" INTEGER NOT NULL,
    "actual_stock" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "remanent_number" TEXT,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" INTEGER,
    CONSTRAINT "okuc_history_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "okuc_history_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "okuc_imports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_at" DATETIME,
    "error_message" TEXT,
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "previewData" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,
    CONSTRAINT "okuc_imports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "okuc_product_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "okuc_product_images_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "okuc_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eur_pln_rate" REAL NOT NULL DEFAULT 4.35,
    "default_delivery_time" INTEGER NOT NULL DEFAULT 1,
    "average_from_date" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_number_key" ON "profiles"("number");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_article_number_key" ON "profiles"("article_number");

-- CreateIndex
CREATE UNIQUE INDEX "colors_code_key" ON "colors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "profile_colors_profile_id_color_id_key" ON "profile_colors"("profile_id", "color_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_archived_at_idx" ON "orders"("archived_at");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "order_requirements_color_id_idx" ON "order_requirements"("color_id");

-- CreateIndex
CREATE INDEX "order_requirements_profile_id_idx" ON "order_requirements"("profile_id");

-- CreateIndex
CREATE INDEX "order_requirements_order_id_idx" ON "order_requirements"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_requirements_order_id_profile_id_color_id_key" ON "order_requirements"("order_id", "profile_id", "color_id");

-- CreateIndex
CREATE INDEX "warehouse_stock_color_id_idx" ON "warehouse_stock"("color_id");

-- CreateIndex
CREATE INDEX "warehouse_stock_profile_id_idx" ON "warehouse_stock"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_stock_profile_id_color_id_key" ON "warehouse_stock"("profile_id", "color_id");

-- CreateIndex
CREATE INDEX "warehouse_orders_status_idx" ON "warehouse_orders"("status");

-- CreateIndex
CREATE INDEX "warehouse_orders_color_id_idx" ON "warehouse_orders"("color_id");

-- CreateIndex
CREATE INDEX "warehouse_orders_profile_id_idx" ON "warehouse_orders"("profile_id");

-- CreateIndex
CREATE INDEX "warehouse_history_color_id_idx" ON "warehouse_history"("color_id");

-- CreateIndex
CREATE INDEX "warehouse_history_profile_id_idx" ON "warehouse_history"("profile_id");

-- CreateIndex
CREATE INDEX "warehouse_history_recorded_at_idx" ON "warehouse_history"("recorded_at");

-- CreateIndex
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");

-- CreateIndex
CREATE INDEX "deliveries_delivery_date_idx" ON "deliveries"("delivery_date");

-- CreateIndex
CREATE INDEX "deliveries_created_at_idx" ON "deliveries"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_delivery_id_order_id_key" ON "delivery_orders"("delivery_id", "order_id");

-- CreateIndex
CREATE INDEX "file_imports_status_idx" ON "file_imports"("status");

-- CreateIndex
CREATE INDEX "file_imports_created_at_idx" ON "file_imports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "working_days_date_key" ON "working_days"("date");

-- CreateIndex
CREATE UNIQUE INDEX "okuc_articles_articleNumber_key" ON "okuc_articles"("articleNumber");

-- CreateIndex
CREATE INDEX "okuc_articles_group_idx" ON "okuc_articles"("group");

-- CreateIndex
CREATE INDEX "okuc_articles_warehouse_idx" ON "okuc_articles"("warehouse");

-- CreateIndex
CREATE UNIQUE INDEX "okuc_stock_article_id_key" ON "okuc_stock"("article_id");

-- CreateIndex
CREATE INDEX "okuc_orders_status_idx" ON "okuc_orders"("status");

-- CreateIndex
CREATE INDEX "okuc_orders_article_id_idx" ON "okuc_orders"("article_id");

-- CreateIndex
CREATE INDEX "okuc_requirements_article_id_idx" ON "okuc_requirements"("article_id");

-- CreateIndex
CREATE INDEX "okuc_requirements_document_type_idx" ON "okuc_requirements"("document_type");

-- CreateIndex
CREATE INDEX "okuc_requirements_recorded_at_idx" ON "okuc_requirements"("recorded_at");

-- CreateIndex
CREATE INDEX "okuc_history_article_id_idx" ON "okuc_history"("article_id");

-- CreateIndex
CREATE INDEX "okuc_history_recorded_at_idx" ON "okuc_history"("recorded_at");

-- CreateIndex
CREATE INDEX "okuc_imports_status_idx" ON "okuc_imports"("status");

-- CreateIndex
CREATE INDEX "okuc_imports_created_at_idx" ON "okuc_imports"("created_at");
