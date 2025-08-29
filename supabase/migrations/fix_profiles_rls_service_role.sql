-- Fix RLS policies for profiles table to allow service_role access
-- This is needed for backend scripts to manage user profiles

-- First, drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Service role can access all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can access own profile" ON profiles;

-- Create a comprehensive policy for service_role
CREATE POLICY "Service role full access to profiles" ON profiles
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to access their own profiles
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure service_role has all necessary grants
GRANT ALL ON profiles TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Also grant sequence permissions if needed
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;