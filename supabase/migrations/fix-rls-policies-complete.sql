-- Fix RLS Policies - Complete Isolation Solution
-- This migration ensures complete data isolation between users

-- 1. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "surveys_select_own" ON surveys;
DROP POLICY IF EXISTS "surveys_insert_own" ON surveys;
DROP POLICY IF EXISTS "surveys_update_own" ON surveys;
DROP POLICY IF EXISTS "surveys_delete_own" ON surveys;
DROP POLICY IF EXISTS "Enable read access for all users" ON surveys;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON surveys;
DROP POLICY IF EXISTS "Enable update for users based on email" ON surveys;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON surveys;

-- Drop any existing policies on responses table
DROP POLICY IF EXISTS "responses_select_own" ON responses;
DROP POLICY IF EXISTS "responses_insert_own" ON responses;
DROP POLICY IF EXISTS "responses_update_own" ON responses;
DROP POLICY IF EXISTS "responses_delete_own" ON responses;
DROP POLICY IF EXISTS "Enable read access for all users" ON responses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON responses;
DROP POLICY IF EXISTS "Enable update for users based on email" ON responses;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON responses;

-- Drop any existing policies on profiles table
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON profiles;

-- 2. Ensure RLS is enabled on all tables
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create strict RLS policies for surveys table
-- Only allow users to see their own surveys
CREATE POLICY "surveys_select_own" ON surveys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only allow users to insert surveys with their own user_id
CREATE POLICY "surveys_insert_own" ON surveys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only allow users to update their own surveys
CREATE POLICY "surveys_update_own" ON surveys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only allow users to delete their own surveys
CREATE POLICY "surveys_delete_own" ON surveys
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create strict RLS policies for responses table
-- Users can only see responses to their own surveys
CREATE POLICY "responses_select_own" ON responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = responses.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- Allow inserting responses to any survey (public responses)
CREATE POLICY "responses_insert_public" ON responses
  FOR INSERT
  WITH CHECK (true);

-- Only survey owners can update responses to their surveys
CREATE POLICY "responses_update_own" ON responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = responses.survey_id 
      AND surveys.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = responses.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- Only survey owners can delete responses to their surveys
CREATE POLICY "responses_delete_own" ON responses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = responses.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- 5. Create strict RLS policies for profiles table
-- Users can only see their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own profile
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own profile
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Revoke any excessive permissions and grant only necessary ones
-- Revoke all permissions first
REVOKE ALL ON surveys FROM anon;
REVOKE ALL ON surveys FROM authenticated;
REVOKE ALL ON responses FROM anon;
REVOKE ALL ON responses FROM authenticated;
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON profiles FROM authenticated;

-- Grant minimal necessary permissions
-- Surveys: authenticated users need full access (controlled by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON surveys TO authenticated;

-- Responses: authenticated users need full access (controlled by RLS)
-- Anonymous users need INSERT to submit responses
GRANT INSERT ON responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON responses TO authenticated;

-- Profiles: authenticated users need full access (controlled by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

-- 7. Create indexes to improve RLS performance
CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 8. Add comments for documentation
COMMENT ON POLICY "surveys_select_own" ON surveys IS 'Users can only select their own surveys';
COMMENT ON POLICY "surveys_insert_own" ON surveys IS 'Users can only insert surveys with their own user_id';
COMMENT ON POLICY "surveys_update_own" ON surveys IS 'Users can only update their own surveys';
COMMENT ON POLICY "surveys_delete_own" ON surveys IS 'Users can only delete their own surveys';

COMMENT ON POLICY "responses_select_own" ON responses IS 'Users can only see responses to their own surveys';
COMMENT ON POLICY "responses_insert_public" ON responses IS 'Anyone can submit responses to surveys';
COMMENT ON POLICY "responses_update_own" ON responses IS 'Only survey owners can update responses';
COMMENT ON POLICY "responses_delete_own" ON responses IS 'Only survey owners can delete responses';

COMMENT ON POLICY "profiles_select_own" ON profiles IS 'Users can only see their own profile';
COMMENT ON POLICY "profiles_insert_own" ON profiles IS 'Users can only insert their own profile';
COMMENT ON POLICY "profiles_update_own" ON profiles IS 'Users can only update their own profile';
COMMENT ON POLICY "profiles_delete_own" ON profiles IS 'Users can only delete their own profile';