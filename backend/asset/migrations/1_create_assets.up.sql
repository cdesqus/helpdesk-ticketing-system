CREATE TABLE assets (
  id BIGSERIAL PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  hostname TEXT,
  product_name TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  model TEXT,
  category TEXT NOT NULL CHECK (category IN ('laptop', 'network_device', 'printer', 'license', 'scanner', 'consumable')),
  location TEXT,
  assigned_user TEXT,
  assigned_user_email TEXT,
  date_acquired DATE,
  warranty_expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('in_use', 'available', 'out_of_order', 'maintenance', 'retired')),
  comments TEXT,
  qr_code_data TEXT,
  total_licenses INTEGER,
  used_licenses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE asset_audits (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  audited_by TEXT NOT NULL,
  audit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'not_found')),
  scanned_data TEXT,
  notes TEXT
);

CREATE INDEX idx_assets_asset_id ON assets(asset_id);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_assigned_user ON assets(assigned_user);
CREATE INDEX idx_assets_warranty_expiry ON assets(warranty_expiry_date);
CREATE INDEX idx_asset_audits_asset_id ON asset_audits(asset_id);
CREATE INDEX idx_asset_audits_audit_date ON asset_audits(audit_date);

-- Insert sample data for testing
INSERT INTO assets (
  asset_id, hostname, product_name, serial_number, brand_name, model, category, 
  location, assigned_user, assigned_user_email, date_acquired, warranty_expiry_date, status
) VALUES 
  ('LAPTOP001', 'LAPTOP-JOHN01', 'Laptop', 'DL123456789', 'Dell', 'XPS 13', 'laptop', 'Office Floor 1', 'John Doe', 'john.doe@idesolusi.co.id', '2023-01-15', '2025-01-15', 'in_use'),
  ('PRINTER001', 'PRINTER-01', 'Laser Printer', 'HP987654321', 'HP', 'LaserJet Pro 400', 'printer', 'Office Reception', 'Jane Smith', 'jane.smith@idesolusi.co.id', '2022-06-10', '2024-06-10', 'in_use'),
  ('SWITCH001', 'SW-CORE-01', 'Network Switch', 'CS789123456', 'Cisco', 'Catalyst 2960', 'network_device', 'Server Room', 'IT Team', 'it@idesolusi.co.id', '2021-03-20', '2024-03-20', 'in_use'),
  ('LICENSE001', 'MS-OFFICE-365', 'Microsoft Office 365', 'MSO365-12345', 'Microsoft', 'Business Premium', 'license', 'Software Licenses', NULL, NULL, '2023-01-01', '2024-01-01', 'in_use'),
  ('SCANNER001', 'SCANNER-01', 'Document Scanner', 'EP456789123', 'Epson', 'WorkForce DS-780', 'scanner', 'Office Floor 2', 'Bob Wilson', 'bob.wilson@idesolusi.co.id', '2022-09-15', '2024-09-15', 'in_use');

-- Update license data
UPDATE assets SET total_licenses = 50, used_licenses = 35 WHERE asset_id = 'LICENSE001';
