-- Check existing users
SELECT id, email, created_at FROM auth.users LIMIT 5;

-- Check existing surveys
SELECT id, user_id, title, current_responses FROM surveys LIMIT 5;