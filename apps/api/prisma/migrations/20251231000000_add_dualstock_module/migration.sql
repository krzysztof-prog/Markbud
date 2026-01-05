-- DualStock Module Tables
-- Migration: 20251231000000_add_dualstock_module

-- OkucArticle - Main article catalog
CREATE TABLE IF NOT EXISTS okuc_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  used_in_pvc INTEGER NOT NULL DEFAULT 0,
  used_in_alu INTEGER NOT NULL DEFAULT 0,
  order_class TEXT NOT NULL DEFAULT 'typical',
  size_class TEXT NOT NULL DEFAULT 'standard',
  order_unit TEXT NOT NULL DEFAULT 'piece',
  packaging_sizes TEXT,
  preferred_size INTEGER,
  supplier_code TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 14,
  safety_days INTEGER NOT NULL DEFAULT 3,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OkucArticleAlias - Old->New article number mapping
CREATE TABLE IF NOT EXISTS okuc_article_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  alias_number TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  deactivated_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES okuc_articles(id) ON DELETE CASCADE
);

-- OkucProportion - Article proportion rules
CREATE TABLE IF NOT EXISTS okuc_proportions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_article_id INTEGER NOT NULL,
  target_article_id INTEGER NOT NULL,
  proportion_type TEXT NOT NULL,
  ratio REAL NOT NULL DEFAULT 1.0,
  split_percent REAL,
  tolerance REAL NOT NULL DEFAULT 0.9,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_article_id) REFERENCES okuc_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (target_article_id) REFERENCES okuc_articles(id) ON DELETE CASCADE,
  UNIQUE (source_article_id, target_article_id)
);

-- OkucStock - Inventory per article/warehouse
CREATE TABLE IF NOT EXISTS okuc_stocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  warehouse_type TEXT NOT NULL,
  sub_warehouse TEXT,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_qty INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated_by_id INTEGER,
  FOREIGN KEY (article_id) REFERENCES okuc_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (last_updated_by_id) REFERENCES users(id),
  UNIQUE (article_id, warehouse_type, sub_warehouse)
);

-- OkucDemand - Requirements/demand for articles
CREATE TABLE IF NOT EXISTS okuc_demands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demand_id TEXT UNIQUE,
  article_id INTEGER NOT NULL,
  order_id INTEGER,
  expected_week TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'order',
  is_manual_edit INTEGER NOT NULL DEFAULT 0,
  edited_at DATETIME,
  edited_by_id INTEGER,
  edit_reason TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES okuc_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (edited_by_id) REFERENCES users(id)
);

-- OkucOrder - Supplier orders
CREATE TABLE IF NOT EXISTS okuc_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  basket_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_items INTEGER NOT NULL DEFAULT 0,
  sent_at DATETIME,
  confirmed_at DATETIME,
  expected_delivery_at DATETIME,
  received_at DATETIME,
  is_manual_edit INTEGER NOT NULL DEFAULT 0,
  edited_at DATETIME,
  edited_by_id INTEGER,
  edit_reason TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_id INTEGER,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_id) REFERENCES users(id),
  FOREIGN KEY (edited_by_id) REFERENCES users(id)
);

-- OkucOrderItem - Order line items
CREATE TABLE IF NOT EXISTS okuc_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  okuc_order_id INTEGER NOT NULL,
  article_id INTEGER NOT NULL,
  ordered_qty INTEGER NOT NULL,
  received_qty INTEGER,
  unit_price REAL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (okuc_order_id) REFERENCES okuc_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES okuc_articles(id) ON DELETE RESTRICT,
  UNIQUE (okuc_order_id, article_id)
);

-- OkucHistory - Change history with manual edit tracking
CREATE TABLE IF NOT EXISTS okuc_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  warehouse_type TEXT NOT NULL,
  sub_warehouse TEXT,
  event_type TEXT NOT NULL,
  previous_qty INTEGER NOT NULL,
  change_qty INTEGER NOT NULL,
  new_qty INTEGER NOT NULL,
  reason TEXT,
  reference TEXT,
  is_manual_edit INTEGER NOT NULL DEFAULT 0,
  edited_at DATETIME,
  edited_by_id INTEGER,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by_id INTEGER,
  FOREIGN KEY (article_id) REFERENCES okuc_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (edited_by_id) REFERENCES users(id),
  FOREIGN KEY (recorded_by_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_okuc_articles_article_id ON okuc_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_okuc_articles_order_class ON okuc_articles(order_class);
CREATE INDEX IF NOT EXISTS idx_okuc_articles_size_class ON okuc_articles(size_class);

CREATE INDEX IF NOT EXISTS idx_okuc_aliases_article_id ON okuc_article_aliases(article_id);
CREATE INDEX IF NOT EXISTS idx_okuc_aliases_alias_number ON okuc_article_aliases(alias_number);

CREATE INDEX IF NOT EXISTS idx_okuc_proportions_source ON okuc_proportions(source_article_id);
CREATE INDEX IF NOT EXISTS idx_okuc_proportions_target ON okuc_proportions(target_article_id);

CREATE INDEX IF NOT EXISTS idx_okuc_stocks_article ON okuc_stocks(article_id);
CREATE INDEX IF NOT EXISTS idx_okuc_stocks_warehouse ON okuc_stocks(warehouse_type, sub_warehouse);

CREATE INDEX IF NOT EXISTS idx_okuc_demands_article ON okuc_demands(article_id);
CREATE INDEX IF NOT EXISTS idx_okuc_demands_order ON okuc_demands(order_id);
CREATE INDEX IF NOT EXISTS idx_okuc_demands_week ON okuc_demands(expected_week);
CREATE INDEX IF NOT EXISTS idx_okuc_demands_status ON okuc_demands(status);

CREATE INDEX IF NOT EXISTS idx_okuc_orders_status ON okuc_orders(status);
CREATE INDEX IF NOT EXISTS idx_okuc_orders_basket ON okuc_orders(basket_type);

CREATE INDEX IF NOT EXISTS idx_okuc_order_items_order ON okuc_order_items(okuc_order_id);
CREATE INDEX IF NOT EXISTS idx_okuc_order_items_article ON okuc_order_items(article_id);

CREATE INDEX IF NOT EXISTS idx_okuc_history_article ON okuc_history(article_id);
CREATE INDEX IF NOT EXISTS idx_okuc_history_warehouse ON okuc_history(warehouse_type, sub_warehouse);
CREATE INDEX IF NOT EXISTS idx_okuc_history_event ON okuc_history(event_type);
CREATE INDEX IF NOT EXISTS idx_okuc_history_recorded ON okuc_history(recorded_at);
