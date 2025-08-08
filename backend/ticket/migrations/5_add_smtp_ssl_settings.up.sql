-- Add SSL/TLS configuration columns to smtp_config table
ALTER TABLE smtp_config 
ADD COLUMN use_ssl BOOLEAN DEFAULT FALSE,
ADD COLUMN use_tls BOOLEAN DEFAULT TRUE;

-- Update existing configurations to use TLS by default for common ports
UPDATE smtp_config 
SET use_ssl = (port = 465),
    use_tls = (port != 465)
WHERE use_ssl IS NULL OR use_tls IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN smtp_config.use_ssl IS 'Use SSL encryption (typically for port 465)';
COMMENT ON COLUMN smtp_config.use_tls IS 'Use TLS encryption (typically for ports 587, 25)';
