-- Fix permissions for checkout_sessions table
-- This ensures the service role can insert data during checkout creation

-- Grant full access to service_role for checkout_sessions table
GRANT ALL PRIVILEGES ON checkout_sessions TO service_role;

-- Create RLS policy to allow service_role to insert/update/delete
CREATE POLICY "Service role can manage checkout sessions" ON checkout_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Ensure the table has proper RLS policies for authenticated users to read their own sessions
CREATE POLICY "Users can read their own checkout sessions" ON checkout_sessions
  FOR SELECT USING (auth.email() = email);

-- Check current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'checkout_sessions'
AND grantee IN ('anon', 'authenticated', 'service_role') 
ORDER BY table_name, grantee;