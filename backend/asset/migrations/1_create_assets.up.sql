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
  location, assigned_user, assigned_user_email, date_acquired, warranty_expiry_date, status, comments
) VALUES 
  ('LAPTOP001', 'LAPTOP-JOHN01', 'Laptop', 'DL123456789', 'Dell', 'XPS 13', 'laptop', 'Office Floor 1', 'John Doe', 'john.doe@idesolusi.co.id', '2023-01-15', '2025-01-15', 'in_use', 'Primary work laptop'),
  ('PRINTER001', 'PRINTER-01', 'Laser Printer', 'HP987654321', 'HP', 'LaserJet Pro 400', 'printer', 'Office Reception', 'Jane Smith', 'jane.smith@idesolusi.co.id', '2022-06-10', '2024-06-10', 'in_use', ''),
  ('SWITCH001', 'SW-CORE-01', 'Network Switch', 'CS789123456', 'Cisco', 'Catalyst 2960', 'network_device', 'Server Room', 'IT Team', 'it@idesolusi.co.id', '2021-03-20', '2024-03-20', 'in_use', ''),
  ('LICENSE001', 'MS-OFFICE-365', 'Microsoft Office 365', 'MSO365-12345', 'Microsoft', 'Business Premium', 'license', 'Software Licenses', NULL, NULL, '2023-01-01', '2024-01-01', 'in_use', 'Company-wide license'),
  ('SCANNER001', 'SCANNER-01', 'Document Scanner', 'EP456789123', 'Epson', 'WorkForce DS-780', 'scanner', 'Office Floor 2', 'Bob Wilson', 'bob.wilson@idesolusi.co.id', '2022-09-15', '2024-09-15', 'in_use', ''),
  ('LAPTOP002', 'LAPTOP-SARAH01', 'Laptop', 'SN-LAP-002', 'Lenovo', 'ThinkPad X1', 'laptop', 'Office Floor 2', 'Sarah Johnson', 'sarah.johnson@idesolusi.co.id', '2023-02-20', '2026-02-20', 'in_use', 'For remote work'),
  ('LAPTOP003', 'LAPTOP-MIKE01', 'Laptop', 'SN-LAP-003', 'Apple', 'MacBook Pro 14', 'laptop', 'Office Floor 1', 'Mike Wilson', 'mike.wilson@idesolusi.co.id', '2023-03-10', '2026-03-10', 'in_use', ''),
  ('PRINTER002', 'PRINTER-02', 'Color Inkjet Printer', 'SN-PRN-002', 'Epson', 'EcoTank L3250', 'printer', 'Marketing Dept', 'Marketing Team', 'marketing@idesolusi.co.id', '2022-11-05', '2024-11-05', 'available', 'Low on magenta ink'),
  ('PRINTER003', 'PRINTER-03', 'Large Format Printer', 'SN-PRN-003', 'Canon', 'imagePROGRAF', 'printer', 'Design Dept', 'Design Team', 'design@idesolusi.co.id', '2023-05-15', '2025-05-15', 'maintenance', 'Requires service'),
  ('ROUTER001', 'RTR-MAIN-01', 'Router', 'SN-RTR-001', 'MikroTik', 'RB4011iGS+', 'network_device', 'Server Room', 'IT Team', 'it@idesolusi.co.id', '2022-01-10', '2025-01-10', 'in_use', 'Main office router'),
  ('LICENSE002', 'ADOBE-CC-01', 'Adobe Creative Cloud', 'ADOBE-CC-SN01', 'Adobe', 'All Apps', 'license', 'Software Licenses', 'Design Team', 'design@idesolusi.co.id', '2023-07-01', '2024-07-01', 'in_use', '5 seats'),
  ('LICENSE003', 'AUTOCAD-01', 'AutoCAD', 'AUTOCAD-SN01', 'Autodesk', '2024', 'license', 'Software Licenses', 'Engineering Team', 'engineering@idesolusi.co.id', '2023-08-01', '2024-08-01', 'in_use', '10 seats'),
  ('CONSUMABLE001', 'MOUSE-LOGI-01', 'Wireless Mouse', 'N/A', 'Logitech', 'MX Master 3', 'consumable', 'IT Storage', NULL, NULL, '2023-09-01', NULL, 'available', '10 units in stock'),
  ('CONSUMABLE002', 'KEYB-LOGI-01', 'Wireless Keyboard', 'N/A', 'Logitech', 'MX Keys', 'consumable', 'IT Storage', NULL, NULL, '2023-09-01', NULL, 'available', '5 units in stock'),
  ('CONSUMABLE003', 'HDMI-CABLE-01', 'HDMI Cable', 'N/A', 'Generic', '2m', 'consumable', 'IT Storage', NULL, NULL, '2023-01-01', NULL, 'available', '50 units in stock');

-- Update license data
UPDATE assets SET total_licenses = 50, used_licenses = 35 WHERE asset_id = 'LICENSE001';
UPDATE assets SET total_licenses = 5, used_licenses = 5 WHERE asset_id = 'ADOBE-CC-01';
UPDATE assets SET total_licenses = 10, used_licenses = 8 WHERE asset_id = 'AUTOCAD-01';
