-- DropIndex
DROP INDEX "order_requirements_order_id_color_id_idx";

-- DropIndex
DROP INDEX "order_requirements_order_id_idx";

-- DropIndex
DROP INDEX "schuco_fetch_logs_status_idx";

-- AlterTable
ALTER TABLE "production_report_items" ADD COLUMN "override_value_eur" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_currency_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eur_to_pln_rate" INTEGER NOT NULL,
    "effective_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_currency_config" ("created_at", "effective_date", "eur_to_pln_rate", "id", "updated_at") SELECT "created_at", "effective_date", "eur_to_pln_rate", "id", "updated_at" FROM "currency_config";
DROP TABLE "currency_config";
ALTER TABLE "new_currency_config" RENAME TO "currency_config";
CREATE INDEX "currency_config_effective_date_idx" ON "currency_config"("effective_date");
CREATE TABLE "new_deliveries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_date" DATETIME NOT NULL,
    "delivery_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);
INSERT INTO "new_deliveries" ("created_at", "deleted_at", "delivery_date", "delivery_number", "id", "notes", "status", "updated_at") SELECT "created_at", "deleted_at", "delivery_date", "delivery_number", "id", "notes", "status", "updated_at" FROM "deliveries";
DROP TABLE "deliveries";
ALTER TABLE "new_deliveries" RENAME TO "deliveries";
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");
CREATE INDEX "deliveries_delivery_date_idx" ON "deliveries"("delivery_date");
CREATE INDEX "deliveries_created_at_idx" ON "deliveries"("created_at");
CREATE INDEX "deliveries_delivery_date_status_idx" ON "deliveries"("delivery_date", "status");
CREATE INDEX "deliveries_status_delivery_date_idx" ON "deliveries"("status", "delivery_date");
CREATE INDEX "deliveries_deleted_at_idx" ON "deliveries"("deleted_at");
CREATE INDEX "deliveries_status_deleted_at_idx" ON "deliveries"("status", "deleted_at");
CREATE TABLE "new_delivery_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delivery_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "delivery_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "delivery_orders_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_delivery_orders" ("delivery_id", "id", "order_id", "position") SELECT "delivery_id", "id", "order_id", "position" FROM "delivery_orders";
DROP TABLE "delivery_orders";
ALTER TABLE "new_delivery_orders" RENAME TO "delivery_orders";
CREATE INDEX "delivery_orders_delivery_id_position_idx" ON "delivery_orders"("delivery_id", "position");
CREATE INDEX "delivery_orders_order_id_idx" ON "delivery_orders"("order_id");
CREATE UNIQUE INDEX "delivery_orders_delivery_id_order_id_key" ON "delivery_orders"("delivery_id", "order_id");
CREATE TABLE "new_glass_order_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "glass_order_id" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "order_suffix" TEXT,
    "position" TEXT NOT NULL,
    "glass_type" TEXT NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "glass_order_items_glass_order_id_fkey" FOREIGN KEY ("glass_order_id") REFERENCES "glass_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_glass_order_items" ("created_at", "glass_order_id", "glass_type", "height_mm", "id", "order_number", "order_suffix", "position", "quantity", "width_mm") SELECT "created_at", "glass_order_id", "glass_type", "height_mm", "id", "order_number", "order_suffix", "position", "quantity", "width_mm" FROM "glass_order_items";
DROP TABLE "glass_order_items";
ALTER TABLE "new_glass_order_items" RENAME TO "glass_order_items";
CREATE INDEX "glass_order_items_width_mm_height_mm_idx" ON "glass_order_items"("width_mm", "height_mm");
CREATE INDEX "glass_order_items_order_number_order_suffix_idx" ON "glass_order_items"("order_number", "order_suffix");
CREATE INDEX "glass_order_items_order_number_idx" ON "glass_order_items"("order_number");
CREATE INDEX "glass_order_items_glass_order_id_idx" ON "glass_order_items"("glass_order_id");
CREATE UNIQUE INDEX "glass_order_items_glass_order_id_position_key" ON "glass_order_items"("glass_order_id", "position");
CREATE TABLE "new_monthly_report_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "report_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "invoice_number" TEXT,
    "windows_count" INTEGER NOT NULL DEFAULT 0,
    "sashes_count" INTEGER NOT NULL DEFAULT 0,
    "units_count" INTEGER NOT NULL DEFAULT 0,
    "value_pln" INTEGER,
    "value_eur" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monthly_report_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "monthly_report_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "monthly_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_monthly_report_items" ("created_at", "id", "invoice_number", "order_id", "order_number", "report_id", "sashes_count", "units_count", "value_eur", "value_pln", "windows_count") SELECT "created_at", "id", "invoice_number", "order_id", "order_number", "report_id", "sashes_count", "units_count", "value_eur", "value_pln", "windows_count" FROM "monthly_report_items";
DROP TABLE "monthly_report_items";
ALTER TABLE "new_monthly_report_items" RENAME TO "monthly_report_items";
CREATE INDEX "monthly_report_items_report_id_idx" ON "monthly_report_items"("report_id");
CREATE INDEX "monthly_report_items_order_id_idx" ON "monthly_report_items"("order_id");
CREATE TABLE "new_monthly_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "report_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_windows" INTEGER NOT NULL DEFAULT 0,
    "total_sashes" INTEGER NOT NULL DEFAULT 0,
    "total_value_pln" INTEGER NOT NULL DEFAULT 0,
    "total_value_eur" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_monthly_reports" ("created_at", "id", "month", "report_date", "total_orders", "total_sashes", "total_value_eur", "total_value_pln", "total_windows", "updated_at", "year") SELECT "created_at", "id", "month", "report_date", "total_orders", "total_sashes", "total_value_eur", "total_value_pln", "total_windows", "updated_at", "year" FROM "monthly_reports";
DROP TABLE "monthly_reports";
ALTER TABLE "new_monthly_reports" RENAME TO "monthly_reports";
CREATE INDEX "monthly_reports_year_month_idx" ON "monthly_reports"("year", "month");
CREATE INDEX "monthly_reports_report_date_idx" ON "monthly_reports"("report_date");
CREATE UNIQUE INDEX "monthly_reports_year_month_key" ON "monthly_reports"("year", "month");
CREATE TABLE "new_non_productive_task_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_non_productive_task_types" ("created_at", "id", "is_active", "name", "sort_order", "updated_at") SELECT "created_at", "id", "is_active", "name", "sort_order", "updated_at" FROM "non_productive_task_types";
DROP TABLE "non_productive_task_types";
ALTER TABLE "new_non_productive_task_types" RENAME TO "non_productive_task_types";
CREATE UNIQUE INDEX "non_productive_task_types_name_key" ON "non_productive_task_types"("name");
CREATE INDEX "non_productive_task_types_is_active_idx" ON "non_productive_task_types"("is_active");
CREATE INDEX "non_productive_task_types_sort_order_idx" ON "non_productive_task_types"("sort_order");
CREATE TABLE "new_notes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_notes" ("content", "created_at", "created_by_id", "id", "order_id", "updated_at") SELECT "content", "created_at", "created_by_id", "id", "order_id", "updated_at" FROM "notes";
DROP TABLE "notes";
ALTER TABLE "new_notes" RENAME TO "notes";
CREATE TABLE "new_okuc_article_aliases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article_id" INTEGER NOT NULL,
    "alias_number" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "okuc_article_aliases_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_okuc_article_aliases" ("alias_number", "article_id", "created_at", "deactivated_at", "id", "is_active") SELECT "alias_number", "article_id", "created_at", "deactivated_at", "id", "is_active" FROM "okuc_article_aliases";
DROP TABLE "okuc_article_aliases";
ALTER TABLE "new_okuc_article_aliases" RENAME TO "okuc_article_aliases";
CREATE UNIQUE INDEX "okuc_article_aliases_alias_number_key" ON "okuc_article_aliases"("alias_number");
CREATE INDEX "okuc_article_aliases_alias_number_idx" ON "okuc_article_aliases"("alias_number");
CREATE INDEX "okuc_article_aliases_is_active_idx" ON "okuc_article_aliases"("is_active");
CREATE INDEX "okuc_article_aliases_article_id_idx" ON "okuc_article_aliases"("article_id");
CREATE TABLE "new_okuc_articles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "used_in_pvc" BOOLEAN NOT NULL DEFAULT false,
    "used_in_alu" BOOLEAN NOT NULL DEFAULT false,
    "order_class" TEXT NOT NULL DEFAULT 'typical',
    "size_class" TEXT NOT NULL DEFAULT 'standard',
    "order_unit" TEXT NOT NULL DEFAULT 'piece',
    "packaging_sizes" TEXT,
    "preferred_size" INTEGER,
    "supplier_code" TEXT,
    "lead_time_days" INTEGER NOT NULL DEFAULT 14,
    "safety_days" INTEGER NOT NULL DEFAULT 3,
    "location_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "okuc_articles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "okuc_locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_okuc_articles" ("article_id", "created_at", "description", "id", "lead_time_days", "location_id", "name", "order_class", "order_unit", "packaging_sizes", "preferred_size", "safety_days", "size_class", "supplier_code", "updated_at", "used_in_alu", "used_in_pvc") SELECT "article_id", "created_at", "description", "id", "lead_time_days", "location_id", "name", "order_class", "order_unit", "packaging_sizes", "preferred_size", "safety_days", "size_class", "supplier_code", "updated_at", "used_in_alu", "used_in_pvc" FROM "okuc_articles";
DROP TABLE "okuc_articles";
ALTER TABLE "new_okuc_articles" RENAME TO "okuc_articles";
CREATE UNIQUE INDEX "okuc_articles_article_id_key" ON "okuc_articles"("article_id");
CREATE INDEX "okuc_articles_used_in_pvc_idx" ON "okuc_articles"("used_in_pvc");
CREATE INDEX "okuc_articles_used_in_alu_idx" ON "okuc_articles"("used_in_alu");
CREATE INDEX "okuc_articles_order_class_size_class_idx" ON "okuc_articles"("order_class", "size_class");
CREATE INDEX "okuc_articles_article_id_idx" ON "okuc_articles"("article_id");
CREATE INDEX "okuc_articles_deleted_at_idx" ON "okuc_articles"("deleted_at");
CREATE INDEX "okuc_articles_location_id_idx" ON "okuc_articles"("location_id");
CREATE TABLE "new_okuc_demands" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "demand_id" TEXT,
    "article_id" INTEGER NOT NULL,
    "order_id" INTEGER,
    "expected_week" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'order',
    "is_manual_edit" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" DATETIME,
    "edited_by_id" INTEGER,
    "edit_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "okuc_demands_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "okuc_demands_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_okuc_demands" ("article_id", "created_at", "demand_id", "edit_reason", "edited_at", "edited_by_id", "expected_week", "id", "is_manual_edit", "order_id", "quantity", "source", "status", "updated_at") SELECT "article_id", "created_at", "demand_id", "edit_reason", "edited_at", "edited_by_id", "expected_week", "id", "is_manual_edit", "order_id", "quantity", "source", "status", "updated_at" FROM "okuc_demands";
DROP TABLE "okuc_demands";
ALTER TABLE "new_okuc_demands" RENAME TO "okuc_demands";
CREATE UNIQUE INDEX "okuc_demands_demand_id_key" ON "okuc_demands"("demand_id");
CREATE INDEX "okuc_demands_article_id_idx" ON "okuc_demands"("article_id");
CREATE INDEX "okuc_demands_expected_week_idx" ON "okuc_demands"("expected_week");
CREATE INDEX "okuc_demands_status_idx" ON "okuc_demands"("status");
CREATE INDEX "okuc_demands_order_id_idx" ON "okuc_demands"("order_id");
CREATE INDEX "okuc_demands_source_idx" ON "okuc_demands"("source");
CREATE INDEX "okuc_demands_expected_week_status_idx" ON "okuc_demands"("expected_week", "status");
CREATE INDEX "okuc_demands_deleted_at_idx" ON "okuc_demands"("deleted_at");
CREATE TABLE "new_okuc_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article_id" INTEGER NOT NULL,
    "warehouse_type" TEXT NOT NULL,
    "sub_warehouse" TEXT,
    "event_type" TEXT NOT NULL,
    "previous_qty" INTEGER NOT NULL,
    "change_qty" INTEGER NOT NULL,
    "new_qty" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "is_manual_edit" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" DATETIME,
    "edited_by_id" INTEGER,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" INTEGER,
    CONSTRAINT "okuc_history_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "okuc_history_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "okuc_history_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_okuc_history" ("article_id", "change_qty", "edited_at", "edited_by_id", "event_type", "id", "is_manual_edit", "new_qty", "previous_qty", "reason", "recorded_at", "recorded_by_id", "reference", "sub_warehouse", "warehouse_type") SELECT "article_id", "change_qty", "edited_at", "edited_by_id", "event_type", "id", "is_manual_edit", "new_qty", "previous_qty", "reason", "recorded_at", "recorded_by_id", "reference", "sub_warehouse", "warehouse_type" FROM "okuc_history";
DROP TABLE "okuc_history";
ALTER TABLE "new_okuc_history" RENAME TO "okuc_history";
CREATE INDEX "okuc_history_article_id_idx" ON "okuc_history"("article_id");
CREATE INDEX "okuc_history_event_type_idx" ON "okuc_history"("event_type");
CREATE INDEX "okuc_history_recorded_at_idx" ON "okuc_history"("recorded_at");
CREATE INDEX "okuc_history_warehouse_type_idx" ON "okuc_history"("warehouse_type");
CREATE INDEX "okuc_history_warehouse_type_sub_warehouse_idx" ON "okuc_history"("warehouse_type", "sub_warehouse");
CREATE INDEX "okuc_history_is_manual_edit_idx" ON "okuc_history"("is_manual_edit");
CREATE TABLE "new_okuc_order_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "okuc_order_id" INTEGER NOT NULL,
    "article_id" INTEGER NOT NULL,
    "ordered_qty" INTEGER NOT NULL,
    "received_qty" INTEGER,
    "unit_price" INTEGER,
    CONSTRAINT "okuc_order_items_okuc_order_id_fkey" FOREIGN KEY ("okuc_order_id") REFERENCES "okuc_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "okuc_order_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_okuc_order_items" ("article_id", "id", "okuc_order_id", "ordered_qty", "received_qty", "unit_price") SELECT "article_id", "id", "okuc_order_id", "ordered_qty", "received_qty", "unit_price" FROM "okuc_order_items";
DROP TABLE "okuc_order_items";
ALTER TABLE "new_okuc_order_items" RENAME TO "okuc_order_items";
CREATE INDEX "okuc_order_items_okuc_order_id_idx" ON "okuc_order_items"("okuc_order_id");
CREATE INDEX "okuc_order_items_article_id_idx" ON "okuc_order_items"("article_id");
CREATE UNIQUE INDEX "okuc_order_items_okuc_order_id_article_id_key" ON "okuc_order_items"("okuc_order_id", "article_id");
CREATE TABLE "new_okuc_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_number" TEXT NOT NULL,
    "basket_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "expected_delivery_date" DATETIME,
    "actual_delivery_date" DATETIME,
    "notes" TEXT,
    "is_manual_edit" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" DATETIME,
    "edited_by_id" INTEGER,
    "edit_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "okuc_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_okuc_orders" ("basket_type", "created_at", "created_by_id", "edit_reason", "edited_at", "edited_by_id", "id", "is_manual_edit", "order_number", "status", "updated_at") SELECT "basket_type", "created_at", "created_by_id", "edit_reason", "edited_at", "edited_by_id", "id", "is_manual_edit", "order_number", "status", "updated_at" FROM "okuc_orders";
DROP TABLE "okuc_orders";
ALTER TABLE "new_okuc_orders" RENAME TO "okuc_orders";
CREATE UNIQUE INDEX "okuc_orders_order_number_key" ON "okuc_orders"("order_number");
CREATE INDEX "okuc_orders_basket_type_idx" ON "okuc_orders"("basket_type");
CREATE INDEX "okuc_orders_status_idx" ON "okuc_orders"("status");
CREATE INDEX "okuc_orders_expected_delivery_date_idx" ON "okuc_orders"("expected_delivery_date");
CREATE INDEX "okuc_orders_status_basket_type_idx" ON "okuc_orders"("status", "basket_type");
CREATE INDEX "okuc_orders_deleted_at_idx" ON "okuc_orders"("deleted_at");
CREATE TABLE "new_okuc_proportions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source_article_id" INTEGER NOT NULL,
    "target_article_id" INTEGER NOT NULL,
    "proportion_type" TEXT NOT NULL,
    "ratio" REAL NOT NULL DEFAULT 1.0,
    "split_percent" REAL,
    "tolerance" REAL NOT NULL DEFAULT 0.9,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "okuc_proportions_source_article_id_fkey" FOREIGN KEY ("source_article_id") REFERENCES "okuc_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "okuc_proportions_target_article_id_fkey" FOREIGN KEY ("target_article_id") REFERENCES "okuc_articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_okuc_proportions" ("created_at", "id", "is_active", "proportion_type", "ratio", "source_article_id", "split_percent", "target_article_id", "tolerance", "updated_at") SELECT "created_at", "id", "is_active", "proportion_type", "ratio", "source_article_id", "split_percent", "target_article_id", "tolerance", "updated_at" FROM "okuc_proportions";
DROP TABLE "okuc_proportions";
ALTER TABLE "new_okuc_proportions" RENAME TO "okuc_proportions";
CREATE INDEX "okuc_proportions_source_article_id_idx" ON "okuc_proportions"("source_article_id");
CREATE INDEX "okuc_proportions_target_article_id_idx" ON "okuc_proportions"("target_article_id");
CREATE INDEX "okuc_proportions_is_active_idx" ON "okuc_proportions"("is_active");
CREATE INDEX "okuc_proportions_deleted_at_idx" ON "okuc_proportions"("deleted_at");
CREATE UNIQUE INDEX "okuc_proportions_source_article_id_target_article_id_key" ON "okuc_proportions"("source_article_id", "target_article_id");
CREATE TABLE "new_okuc_stocks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "article_id" INTEGER NOT NULL,
    "warehouse_type" TEXT NOT NULL,
    "sub_warehouse" TEXT,
    "current_quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_qty" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER,
    "max_stock" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,
    "updated_by_id" INTEGER,
    CONSTRAINT "okuc_stocks_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "okuc_articles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "okuc_stocks_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_okuc_stocks" ("article_id", "current_quantity", "id", "reserved_qty", "sub_warehouse", "version", "warehouse_type") SELECT "article_id", "current_quantity", "id", "reserved_qty", "sub_warehouse", "version", "warehouse_type" FROM "okuc_stocks";
DROP TABLE "okuc_stocks";
ALTER TABLE "new_okuc_stocks" RENAME TO "okuc_stocks";
CREATE INDEX "okuc_stocks_warehouse_type_idx" ON "okuc_stocks"("warehouse_type");
CREATE INDEX "okuc_stocks_sub_warehouse_idx" ON "okuc_stocks"("sub_warehouse");
CREATE INDEX "okuc_stocks_article_id_idx" ON "okuc_stocks"("article_id");
CREATE UNIQUE INDEX "okuc_stocks_article_id_warehouse_type_sub_warehouse_key" ON "okuc_stocks"("article_id", "warehouse_type", "sub_warehouse");
CREATE TABLE "new_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "client" TEXT,
    "project" TEXT,
    "system" TEXT,
    "deadline" DATETIME,
    "pvc_delivery_date" DATETIME,
    "value_pln" INTEGER,
    "value_eur" INTEGER,
    "invoice_number" TEXT,
    "delivery_date" DATETIME,
    "production_date" DATETIME,
    "glass_delivery_date" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "archived_at" DATETIME,
    "total_glasses" INTEGER,
    "total_sashes" INTEGER,
    "total_windows" INTEGER,
    "completed_at" DATETIME,
    "ordered_glass_count" INTEGER DEFAULT 0,
    "delivered_glass_count" INTEGER DEFAULT 0,
    "glass_order_status" TEXT DEFAULT 'not_ordered',
    "okuc_demand_status" TEXT DEFAULT 'none',
    "variant_type" TEXT,
    "document_author" TEXT,
    "document_author_user_id" INTEGER,
    CONSTRAINT "orders_document_author_user_id_fkey" FOREIGN KEY ("document_author_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("archived_at", "client", "completed_at", "created_at", "deadline", "delivered_glass_count", "delivery_date", "document_author", "document_author_user_id", "glass_delivery_date", "glass_order_status", "id", "invoice_number", "notes", "okuc_demand_status", "order_number", "ordered_glass_count", "production_date", "project", "pvc_delivery_date", "status", "system", "total_glasses", "total_sashes", "total_windows", "updated_at", "value_eur", "value_pln", "variant_type") SELECT "archived_at", "client", "completed_at", "created_at", "deadline", "delivered_glass_count", "delivery_date", "document_author", "document_author_user_id", "glass_delivery_date", "glass_order_status", "id", "invoice_number", "notes", "okuc_demand_status", "order_number", "ordered_glass_count", "production_date", "project", "pvc_delivery_date", "status", "system", "total_glasses", "total_sashes", "total_windows", "updated_at", "value_eur", "value_pln", "variant_type" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_archived_at_idx" ON "orders"("archived_at");
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");
CREATE INDEX "orders_invoice_number_created_at_idx" ON "orders"("invoice_number", "created_at");
CREATE INDEX "orders_invoice_number_delivery_date_idx" ON "orders"("invoice_number", "delivery_date");
CREATE INDEX "orders_status_archived_at_idx" ON "orders"("status", "archived_at");
CREATE INDEX "orders_glass_order_status_idx" ON "orders"("glass_order_status");
CREATE INDEX "orders_glass_order_status_archived_at_idx" ON "orders"("glass_order_status", "archived_at");
CREATE INDEX "orders_delivery_date_status_idx" ON "orders"("delivery_date", "status");
CREATE INDEX "orders_okuc_demand_status_idx" ON "orders"("okuc_demand_status");
CREATE INDEX "orders_production_date_idx" ON "orders"("production_date");
CREATE INDEX "orders_completed_at_idx" ON "orders"("completed_at");
CREATE INDEX "orders_document_author_user_id_archived_at_idx" ON "orders"("document_author_user_id", "archived_at");
CREATE TABLE "new_pending_order_prices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_number" TEXT NOT NULL,
    "reference" TEXT,
    "currency" TEXT NOT NULL,
    "value_netto" INTEGER NOT NULL,
    "value_brutto" INTEGER,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "import_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "applied_at" DATETIME,
    "applied_to_order_id" INTEGER,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pending_order_prices_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "file_imports" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pending_order_prices" ("applied_at", "applied_to_order_id", "created_at", "currency", "expires_at", "filename", "filepath", "id", "import_id", "order_number", "reference", "status", "updated_at", "value_brutto", "value_netto") SELECT "applied_at", "applied_to_order_id", "created_at", "currency", "expires_at", "filename", "filepath", "id", "import_id", "order_number", "reference", "status", "updated_at", "value_brutto", "value_netto" FROM "pending_order_prices";
DROP TABLE "pending_order_prices";
ALTER TABLE "new_pending_order_prices" RENAME TO "pending_order_prices";
CREATE INDEX "pending_order_prices_order_number_idx" ON "pending_order_prices"("order_number");
CREATE INDEX "pending_order_prices_status_idx" ON "pending_order_prices"("status");
CREATE INDEX "pending_order_prices_order_number_status_idx" ON "pending_order_prices"("order_number", "status");
CREATE INDEX "pending_order_prices_expires_at_idx" ON "pending_order_prices"("expires_at");
CREATE INDEX "pending_order_prices_status_expires_at_idx" ON "pending_order_prices"("status", "expires_at");
CREATE INDEX "pending_order_prices_status_applied_at_idx" ON "pending_order_prices"("status", "applied_at");
CREATE TABLE "new_special_work_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_special_work_types" ("created_at", "id", "is_active", "name", "short_name", "sort_order", "updated_at") SELECT "created_at", "id", "is_active", "name", "short_name", "sort_order", "updated_at" FROM "special_work_types";
DROP TABLE "special_work_types";
ALTER TABLE "new_special_work_types" RENAME TO "special_work_types";
CREATE UNIQUE INDEX "special_work_types_name_key" ON "special_work_types"("name");
CREATE INDEX "special_work_types_is_active_idx" ON "special_work_types"("is_active");
CREATE INDEX "special_work_types_sort_order_idx" ON "special_work_types"("sort_order");
CREATE TABLE "new_warehouse_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "calculated_stock" INTEGER NOT NULL,
    "actual_stock" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "previous_stock" INTEGER,
    "current_stock" INTEGER,
    "change_type" TEXT,
    "notes" TEXT,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" INTEGER,
    CONSTRAINT "warehouse_history_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "warehouse_history_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_warehouse_history" ("actual_stock", "calculated_stock", "change_type", "color_id", "current_stock", "difference", "id", "notes", "previous_stock", "profile_id", "recorded_at", "recorded_by_id") SELECT "actual_stock", "calculated_stock", "change_type", "color_id", "current_stock", "difference", "id", "notes", "previous_stock", "profile_id", "recorded_at", "recorded_by_id" FROM "warehouse_history";
DROP TABLE "warehouse_history";
ALTER TABLE "new_warehouse_history" RENAME TO "warehouse_history";
CREATE INDEX "warehouse_history_color_id_idx" ON "warehouse_history"("color_id");
CREATE INDEX "warehouse_history_profile_id_idx" ON "warehouse_history"("profile_id");
CREATE INDEX "warehouse_history_recorded_at_idx" ON "warehouse_history"("recorded_at");
CREATE INDEX "warehouse_history_change_type_idx" ON "warehouse_history"("change_type");
CREATE TABLE "new_warehouse_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "ordered_beams" INTEGER NOT NULL,
    "expected_delivery_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,
    CONSTRAINT "warehouse_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "warehouse_orders_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_orders_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_warehouse_orders" ("color_id", "created_at", "created_by_id", "expected_delivery_date", "id", "notes", "ordered_beams", "profile_id", "status") SELECT "color_id", "created_at", "created_by_id", "expected_delivery_date", "id", "notes", "ordered_beams", "profile_id", "status" FROM "warehouse_orders";
DROP TABLE "warehouse_orders";
ALTER TABLE "new_warehouse_orders" RENAME TO "warehouse_orders";
CREATE INDEX "warehouse_orders_status_idx" ON "warehouse_orders"("status");
CREATE INDEX "warehouse_orders_expected_delivery_date_idx" ON "warehouse_orders"("expected_delivery_date");
CREATE UNIQUE INDEX "warehouse_orders_profile_id_color_id_expected_delivery_date_key" ON "warehouse_orders"("profile_id", "color_id", "expected_delivery_date");
CREATE TABLE "new_warehouse_stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "current_stock_beams" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,
    "updated_by_id" INTEGER,
    "initial_stock_beams" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" DATETIME,
    CONSTRAINT "warehouse_stock_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "warehouse_stock_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_stock_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_warehouse_stock" ("color_id", "current_stock_beams", "deleted_at", "id", "initial_stock_beams", "profile_id", "updated_at", "updated_by_id", "version") SELECT "color_id", "current_stock_beams", "deleted_at", "id", "initial_stock_beams", "profile_id", "updated_at", "updated_by_id", "version" FROM "warehouse_stock";
DROP TABLE "warehouse_stock";
ALTER TABLE "new_warehouse_stock" RENAME TO "warehouse_stock";
CREATE INDEX "warehouse_stock_deleted_at_idx" ON "warehouse_stock"("deleted_at");
CREATE INDEX "warehouse_stock_updated_by_id_idx" ON "warehouse_stock"("updated_by_id");
CREATE UNIQUE INDEX "warehouse_stock_profile_id_color_id_key" ON "warehouse_stock"("profile_id", "color_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "file_imports_status_created_at_idx" ON "file_imports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "glass_delivery_items_glass_delivery_id_position_key" ON "glass_delivery_items"("glass_delivery_id", "position");

-- CreateIndex
CREATE INDEX "order_windows_profile_type_idx" ON "order_windows"("profile_type");

-- CreateIndex
CREATE INDEX "profile_colors_profile_id_idx" ON "profile_colors"("profile_id");

-- CreateIndex
CREATE INDEX "profile_colors_color_id_idx" ON "profile_colors"("color_id");

-- CreateIndex
CREATE INDEX "schuco_deliveries_changed_at_idx" ON "schuco_deliveries"("changed_at");

-- CreateIndex
CREATE INDEX "schuco_deliveries_change_type_changed_at_idx" ON "schuco_deliveries"("change_type", "changed_at");

-- CreateIndex
CREATE INDEX "schuco_deliveries_order_date_parsed_shipping_status_idx" ON "schuco_deliveries"("order_date_parsed", "shipping_status");

-- CreateIndex
CREATE INDEX "schuco_deliveries_shipping_status_order_date_parsed_idx" ON "schuco_deliveries"("shipping_status", "order_date_parsed");

-- CreateIndex
CREATE INDEX "schuco_deliveries_order_number_fetched_at_idx" ON "schuco_deliveries"("order_number", "fetched_at");

-- CreateIndex
CREATE INDEX "schuco_fetch_logs_trigger_type_idx" ON "schuco_fetch_logs"("trigger_type");

-- CreateIndex
CREATE INDEX "working_days_is_working_date_idx" ON "working_days"("is_working", "date");

-- RedefineIndex
DROP INDEX "idx_order_requirements_created_at";
CREATE INDEX "order_requirements_created_at_idx" ON "order_requirements"("created_at");

