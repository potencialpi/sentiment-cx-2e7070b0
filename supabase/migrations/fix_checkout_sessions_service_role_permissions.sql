-- Grant service_role access to checkout_sessions table for orphan session resolution
-- This allows backend scripts to read and manage checkout sessions

-- Grant full privileges to service_role
GRANT ALL PRIVILEGES ON checkout_sessions TO service_role;

-- Create policy to allow service_role to access all checkout_sessions
CREATE POLICY "Service role can access all checkout sessions" ON checkout_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Ensure anon role can read checkout_sessions (needed for some operations)
GRANT SELECT ON checkout_sessions TO anon;

-- Create policy for anon role to read checkout_sessions
CREATE POLICY "Anon can read checkout sessions" ON checkout_sessions
  FOR SELECT USING (true);

-- Check current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'checkout_sessions'
AND grantee IN ('anon', 'authenticated', 'service_role') 
ORDER BY grantee, privilege_type;