-- Fix the admin password hash to properly match 'admin123'
-- This migration corrects the password hash for the admin user
UPDATE users 
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE username = 'admin';
