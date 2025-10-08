ALTER TABLE assets 
  ADD COLUMN is_consumable BOOLEAN DEFAULT FALSE,
  ADD COLUMN quantity INTEGER DEFAULT 0,
  ADD COLUMN min_stock_level INTEGER DEFAULT 0;

CREATE TABLE stock_transactions (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'remove', 'adjustment', 'initial')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  performed_by TEXT NOT NULL,
  reason TEXT,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_transactions_asset_id ON stock_transactions(asset_id);
CREATE INDEX idx_stock_transactions_created_at ON stock_transactions(created_at);
CREATE INDEX idx_stock_transactions_type ON stock_transactions(transaction_type);

UPDATE assets 
SET is_consumable = TRUE,
    quantity = CASE 
      WHEN asset_id = 'CONSUMABLE001' THEN 10
      WHEN asset_id = 'CONSUMABLE002' THEN 5
      WHEN asset_id = 'CONSUMABLE003' THEN 50
      ELSE 0
    END,
    min_stock_level = CASE 
      WHEN asset_id = 'CONSUMABLE001' THEN 3
      WHEN asset_id = 'CONSUMABLE002' THEN 2
      WHEN asset_id = 'CONSUMABLE003' THEN 10
      ELSE 0
    END
WHERE category = 'consumable';

INSERT INTO stock_transactions (asset_id, transaction_type, quantity_change, quantity_before, quantity_after, performed_by, reason)
SELECT 
  id, 
  'initial', 
  quantity, 
  0, 
  quantity, 
  'system', 
  'Initial stock setup'
FROM assets 
WHERE is_consumable = TRUE AND quantity > 0;
