-- Make userId NOT NULL in audit/history tables
-- Migration: 20251230112214_make_userid_not_null

-- Step 1: Ensure system user exists (id = 1)
-- This query is safe to run multiple times (INSERT OR IGNORE)
INSERT OR IGNORE INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES (
  1,
  'system@akrobud.local',
  '$2a$10$dummy.hash.for.system.user.placeholder',
  'System User',
  'system',
  datetime('now'),
  datetime('now')
);

-- Step 2: Update NULL userId values to system user (id = 1)

-- WarehouseHistory.recordedById
UPDATE warehouse_history
SET recorded_by_id = 1
WHERE recorded_by_id IS NULL;

-- WarehouseStock.updatedById
UPDATE warehouse_stock
SET updated_by_id = 1
WHERE updated_by_id IS NULL;

-- WarehouseOrder.createdById
UPDATE warehouse_orders
SET created_by_id = 1
WHERE created_by_id IS NULL;

-- Note.createdById
UPDATE notes
SET created_by_id = 1
WHERE created_by_id IS NULL;

-- Step 3: Alter tables to make userId NOT NULL
-- SQLite doesn't support ALTER COLUMN directly, so we need to recreate tables

-- 3.1 WarehouseHistory
CREATE TABLE warehouse_history_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  color_id INTEGER NOT NULL,
  calculated_stock INTEGER NOT NULL,
  actual_stock INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  previous_stock INTEGER,
  current_stock INTEGER,
  change_type TEXT,
  notes TEXT,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by_id INTEGER NOT NULL,
  FOREIGN KEY (recorded_by_id) REFERENCES users(id),
  FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE RESTRICT,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT
);

INSERT INTO warehouse_history_new (id, profile_id, color_id, calculated_stock, actual_stock, difference, previous_stock, current_stock, change_type, notes, recorded_at, recorded_by_id)
SELECT id, profile_id, color_id, calculated_stock, actual_stock, difference,
       NULL, NULL, NULL, NULL, recorded_at, recorded_by_id
FROM warehouse_history;

DROP TABLE warehouse_history;
ALTER TABLE warehouse_history_new RENAME TO warehouse_history;

CREATE INDEX idx_warehouse_history_color_id ON warehouse_history(color_id);
CREATE INDEX idx_warehouse_history_profile_id ON warehouse_history(profile_id);
CREATE INDEX idx_warehouse_history_recorded_at ON warehouse_history(recorded_at);
CREATE INDEX idx_warehouse_history_change_type ON warehouse_history(change_type);

-- 3.2 WarehouseStock
CREATE TABLE warehouse_stock_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  color_id INTEGER NOT NULL,
  current_stock_beams INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by_id INTEGER NOT NULL,
  initial_stock_beams INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (updated_by_id) REFERENCES users(id),
  FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE RESTRICT,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  UNIQUE (profile_id, color_id)
);

INSERT INTO warehouse_stock_new
SELECT id, profile_id, color_id, current_stock_beams, updated_at, updated_by_id,
       initial_stock_beams, version
FROM warehouse_stock;

DROP TABLE warehouse_stock;
ALTER TABLE warehouse_stock_new RENAME TO warehouse_stock;

CREATE UNIQUE INDEX idx_warehouse_stock_profile_color ON warehouse_stock(profile_id, color_id);
CREATE INDEX idx_warehouse_stock_color_id ON warehouse_stock(color_id);
CREATE INDEX idx_warehouse_stock_profile_id ON warehouse_stock(profile_id);

-- 3.3 WarehouseOrder
CREATE TABLE warehouse_orders_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  color_id INTEGER NOT NULL,
  ordered_beams INTEGER NOT NULL,
  expected_delivery_date DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_id INTEGER NOT NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id),
  FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE RESTRICT,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  UNIQUE (profile_id, color_id, expected_delivery_date)
);

INSERT INTO warehouse_orders_new
SELECT id, profile_id, color_id, ordered_beams, expected_delivery_date, status,
       notes, created_at, created_by_id
FROM warehouse_orders;

DROP TABLE warehouse_orders;
ALTER TABLE warehouse_orders_new RENAME TO warehouse_orders;

CREATE UNIQUE INDEX idx_warehouse_orders_unique ON warehouse_orders(profile_id, color_id, expected_delivery_date);
CREATE INDEX idx_warehouse_orders_status ON warehouse_orders(status);
CREATE INDEX idx_warehouse_orders_color_id ON warehouse_orders(color_id);
CREATE INDEX idx_warehouse_orders_profile_id ON warehouse_orders(profile_id);

-- 3.4 Notes
CREATE TABLE notes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_id INTEGER NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

INSERT INTO notes_new
SELECT id, order_id, content, created_at, created_by_id, updated_at
FROM notes;

DROP TABLE notes;
ALTER TABLE notes_new RENAME TO notes;

-- Step 4: Verify all records have valid userId
-- These queries should return 0 if migration was successful
SELECT COUNT(*) as invalid_warehouse_history FROM warehouse_history WHERE recorded_by_id IS NULL;
SELECT COUNT(*) as invalid_warehouse_stock FROM warehouse_stock WHERE updated_by_id IS NULL;
SELECT COUNT(*) as invalid_warehouse_orders FROM warehouse_orders WHERE created_by_id IS NULL;
SELECT COUNT(*) as invalid_notes FROM notes WHERE created_by_id IS NULL;
