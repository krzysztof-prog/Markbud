-- Remove Foreign Key constraint from GlassOrderItem.orderNumber
-- This allows importing glass orders even when production orders don't exist yet
-- Validation warnings are tracked via GlassOrderValidation table

-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table
-- First: Clean up any leftover backup table from previous failed attempts
DROP TABLE IF EXISTS glass_order_items_backup;

-- Backup existing data
CREATE TABLE glass_order_items_backup AS SELECT * FROM glass_order_items;

-- Drop the table with FK constraint
DROP TABLE glass_order_items;

-- Recreate table WITHOUT the Foreign Key to orders
CREATE TABLE glass_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  glass_order_id INTEGER NOT NULL,
  order_number TEXT NOT NULL,
  order_suffix TEXT,
  position TEXT NOT NULL,
  glass_type TEXT NOT NULL,
  width_mm INTEGER NOT NULL,
  height_mm INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (glass_order_id) REFERENCES glass_orders(id) ON DELETE CASCADE,
  UNIQUE (glass_order_id, position)
);

-- Restore data (OR IGNORE to skip duplicates caused by UNIQUE constraint)
INSERT OR IGNORE INTO glass_order_items
SELECT * FROM glass_order_items_backup;

-- Drop backup
DROP TABLE glass_order_items_backup;

-- Recreate indexes
CREATE INDEX idx_glass_order_items_width_height ON glass_order_items(width_mm, height_mm);
CREATE INDEX idx_glass_order_items_order_suffix ON glass_order_items(order_number, order_suffix);
CREATE INDEX idx_glass_order_items_order_number ON glass_order_items(order_number);
CREATE INDEX idx_glass_order_items_glass_order_id ON glass_order_items(glass_order_id);
