-- Add resolution field to tickets table
ALTER TABLE tickets 
ADD COLUMN resolution TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tickets.resolution IS 'Resolution description when ticket is resolved or closed';
