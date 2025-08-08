CREATE TABLE system_config (
  id BIGSERIAL PRIMARY KEY,
  system_name TEXT NOT NULL DEFAULT 'IDESOLUSI Helpdesk',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#1e40af',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO system_config (system_name, primary_color, secondary_color) VALUES 
  ('IDESOLUSI Helpdesk', '#3b82f6', '#1e40af');
