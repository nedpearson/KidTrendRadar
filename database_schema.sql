-- Local-first syncing database schema for SQLite / RxDB / WatermelonDB

CREATE TABLE IF NOT EXISTS trends_signals (
  id TEXT PRIMARY KEY,
  source_name TEXT,
  source_type TEXT CHECK(source_type IN ('google_trends', 'tiktok', 'pinterest', 'web', 'retailer', 'marketplace', 'brand', 'social', 'manual')),
  entity_type TEXT CHECK(entity_type IN ('product', 'brand', 'character', 'category', 'keyword')),
  entity_name TEXT,
  product_name TEXT,
  brand_name TEXT,
  category TEXT,
  subcategory TEXT,
  region TEXT,
  timestamp DATETIME,
  interest_score REAL,
  velocity_score REAL,
  sentiment_estimate REAL,
  source_url TEXT,
  product_url TEXT,
  image_url TEXT,
  currency TEXT(3),
  observed_price REAL,
  availability_signal TEXT CHECK(availability_signal IN ('in_stock', 'out_of_stock', 'preorder', 'limited')),
  confidence REAL,
  raw_payload TEXT, -- JSON
  normalized_payload_hash TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS product_opportunities (
  id TEXT PRIMARY KEY,
  name TEXT,
  brand TEXT,
  category TEXT,
  description TEXT,
  composite_score REAL,
  subscore_popularity REAL,
  subscore_velocity REAL,
  subscore_early_signal REAL,
  subscore_durability REAL,
  subscore_margin_potential REAL,
  subscore_sourcing_confidence REAL,
  subscore_saturation_risk REAL,
  insight_reasoning TEXT,
  best_source_url TEXT,
  best_source_price REAL,
  best_source_confidence REAL,
  best_source_reason TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS sync_operations_log (
  operation_id TEXT PRIMARY KEY,
  table_name TEXT,
  record_id TEXT,
  action TEXT CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')),
  payload TEXT, -- JSON version of the row delta
  timestamp DATETIME,
  origin_device_id TEXT
);
