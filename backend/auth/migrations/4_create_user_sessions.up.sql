-- Create user sessions table for persistent session storage
CREATE TABLE user_sessions (
  token TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'engineer', 'reporter')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_last_accessed ON user_sessions(last_accessed);

-- Add foreign key constraint (optional, but good practice)
-- ALTER TABLE user_sessions ADD CONSTRAINT fk_user_sessions_user_id 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
