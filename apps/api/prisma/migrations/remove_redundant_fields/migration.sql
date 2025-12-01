-- Remove redundant calculated fields from orders table
-- These fields are stale and should be calculated on-demand from relationships
PRAGMA foreign_keys=OFF;

-- Step 1: Create new orders table without redundant fields
CREATE TABLE orders_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  value_pln REAL,
  value_eur REAL,
  invoice_number TEXT,
  delivery_date DATETIME,
  production_date DATETIME,
  glass_delivery_date DATETIME,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL,
  archived_at DATETIME
);

-- Step 2: Copy data from old table
INSERT INTO orders_new SELECT
  id, order_number, status, value_pln, value_eur, invoice_number,
  delivery_date, production_date, glass_delivery_date, notes,
  created_at, updated_at, archived_at
FROM orders;

-- Step 3: Drop old table
DROP TABLE orders;

-- Step 4: Rename new table
ALTER TABLE orders_new RENAME TO orders;

-- Step 5: Recreate indices
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_archived_at ON orders(archived_at);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Step 6: Remove redundant fields from deliveries table
CREATE TABLE deliveries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  delivery_date DATETIME NOT NULL,
  delivery_number TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL
);

-- Step 7: Copy data from old deliveries table
INSERT INTO deliveries_new SELECT
  id, delivery_date, delivery_number, status, notes,
  created_at, updated_at
FROM deliveries;

-- Step 8: Drop old deliveries table
DROP TABLE deliveries;

-- Step 9: Rename new deliveries table
ALTER TABLE deliveries_new RENAME TO deliveries;

-- Step 10: Recreate deliveries indices
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_delivery_date ON deliveries(delivery_date);
CREATE INDEX idx_deliveries_created_at ON deliveries(created_at);

-- Step 11: Remove redundant fields from warehouse_stock table
CREATE TABLE warehouse_stock_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  profile_id INTEGER NOT NULL,
  color_id INTEGER NOT NULL,
  current_stock_beams INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  updated_by_id INTEGER,
  UNIQUE(profile_id, color_id),
  FOREIGN KEY(profile_id) REFERENCES profiles(id),
  FOREIGN KEY(color_id) REFERENCES colors(id),
  FOREIGN KEY(updated_by_id) REFERENCES users(id)
);

-- Step 12: Copy data from old warehouse_stock
INSERT INTO warehouse_stock_new SELECT
  id, profile_id, color_id, current_stock_beams,
  updated_at, updated_by_id
FROM warehouse_stock;

-- Step 13: Drop old warehouse_stock
DROP TABLE warehouse_stock;

-- Step 14: Rename new warehouse_stock
ALTER TABLE warehouse_stock_new RENAME TO warehouse_stock;

-- Step 15: Recreate warehouse_stock indices
CREATE INDEX idx_warehouse_stock_color_id ON warehouse_stock(color_id);
CREATE INDEX idx_warehouse_stock_profile_id ON warehouse_stock(profile_id);

-- Step 16: Remove redundant fields from okuc_stock
CREATE TABLE okuc_stock_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  article_id INTEGER UNIQUE NOT NULL,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OK',
  updated_at DATETIME NOT NULL,
  updated_by_id INTEGER,
  FOREIGN KEY(article_id) REFERENCES okuc_articles(id) ON DELETE CASCADE,
  FOREIGN KEY(updated_by_id) REFERENCES users(id)
);

-- Step 17: Copy data from old okuc_stock
INSERT INTO okuc_stock_new SELECT
  id, article_id, current_quantity, status,
  updated_at, updated_by_id
FROM okuc_stock;

-- Step 18: Drop old okuc_stock
DROP TABLE okuc_stock;

-- Step 19: Rename new okuc_stock
ALTER TABLE okuc_stock_new RENAME TO okuc_stock;

-- Step 20: Add new indices for performance
CREATE INDEX idx_order_requirements_created_at ON order_requirements(created_at);
CREATE INDEX idx_okuc_requirements_document_number ON okuc_requirements(document_number);

PRAGMA foreign_keys=ON;
