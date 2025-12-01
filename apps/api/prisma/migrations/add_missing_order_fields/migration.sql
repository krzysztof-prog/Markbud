-- Add missing fields to orders table for order summary pages
PRAGMA foreign_keys=OFF;

CREATE TABLE orders_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  client TEXT,
  project TEXT,
  system TEXT,
  deadline DATETIME,
  pvc_delivery_date DATETIME,
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

INSERT INTO orders_new SELECT
  id, order_number, status, NULL, NULL, NULL, NULL, NULL,
  value_pln, value_eur, invoice_number, delivery_date,
  production_date, glass_delivery_date, notes,
  created_at, updated_at, archived_at
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_archived_at_idx ON orders(archived_at);
CREATE INDEX orders_created_at_idx ON orders(created_at);
CREATE UNIQUE INDEX orders_order_number_key ON orders(order_number);

PRAGMA foreign_keys=ON;
