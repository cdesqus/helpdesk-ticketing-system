CREATE TABLE IF NOT EXISTS asset_transfer_history (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_user VARCHAR(255),
  from_user_email VARCHAR(255),
  to_user VARCHAR(255),
  to_user_email VARCHAR(255),
  from_location VARCHAR(255),
  to_location VARCHAR(255),
  transfer_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  transferred_by VARCHAR(255) NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asset_transfer_history_asset_id ON asset_transfer_history(asset_id);
CREATE INDEX idx_asset_transfer_history_transfer_date ON asset_transfer_history(transfer_date DESC);