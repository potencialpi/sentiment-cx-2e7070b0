-- Grant service_role access to profiles table for orphan session resolution
-- This allows backend scripts to read and manage user profiles

-- Grant full privileges to service_role
GRANT ALL PRIVILEGES ON profiles TO service_role;

-- Create policy to allow service_role to access all profiles
CREATE POLICY "Service role can access all profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Ensure authenticated role can access their own profiles (if not already set)
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- Create policy for authenticated users to access their own profiles
CREATE POLICY "Users can access own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id);

-- Check current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('anon', 'authenticated', 'service_role') 
ORDER BY grantee, privilege_type;