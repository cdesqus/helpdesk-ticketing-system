-- Add haryanto as admin user
-- Password: P@ssw0rd (hashed with bcrypt)
INSERT INTO users (username, password_hash, email, full_name, role, status, created_at, updated_at) VALUES 
  ('haryanto', '$2b$10$N9qo8uLOickgx2ZMRZoMye.fDkkxrHyvnpkmWq0TthHFPbEKu9H2u', 'haryanto@idesolusi.co.id', 'Haryanto', 'admin', 'active', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;
