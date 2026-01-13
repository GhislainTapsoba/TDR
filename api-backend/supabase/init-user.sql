-- Insert default admin user
-- Password is 'admin123' hashed with bcrypt
INSERT INTO public.users (id, email, name, role, password) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@example.com', 'Admin User', 'ADMIN', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
