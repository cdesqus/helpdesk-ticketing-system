CREATE TABLE tickets (
  id BIGSERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  priority TEXT NOT NULL DEFAULT 'Medium',
  assigned_engineer TEXT,
  reporter_name TEXT NOT NULL,
  reporter_email TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  custom_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE engineers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE smtp_config (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO engineers (name, email) VALUES 
  ('John Smith', 'john.smith@idesolusi.co.id'),
  ('Sarah Johnson', 'sarah.johnson@idesolusi.co.id'),
  ('Mike Wilson', 'mike.wilson@idesolusi.co.id'),
  ('Lisa Chen', 'lisa.chen@idesolusi.co.id');
