-- Force RLS Reset - Complete Policy Recreation
-- This migration forces a complete reset of RLS policies

-- 1. Disable RLS temporarily to clear everything
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (using IF EXISTS to avoid errors)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on surveys table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'surveys'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON surveys', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on responses table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'responses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON responses', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on profiles table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Force RLS for all roles (including service_role for testing)
ALTER TABLE surveys FORCE ROW LEVEL SECURITY;
ALTER TABLE responses FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- 5. Create the most restrictive policies possible

-- SURVEYS TABLE POLICIES
-- Users can only SELECT their own surveys
CREATE POLICY "surveys_user_select" ON surveys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only INSERT surveys with their own user_id
CREATE POLICY "surveys_user_insert" ON surveys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own surveys
CREATE POLICY "surveys_user_update" ON surveys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own surveys
CREATE POLICY "surveys_user_delete" ON surveys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RESPONSES TABLE POLICIES
-- Users can only see responses to their own surveys
CREATE POLICY "responses_owner_select" ON responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = responses.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- Anyone can insert responses (for public survey participation)
CREATE POLICY "responses_public_insert" ON responses
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Only survey owners can update responses
CREATE POLICY "responses_owner_update" ON responses
  FOR UPDATE
  TO authenticated
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

-- Only survey owners can delete responses
CREATE POLICY "responses_owner_delete" ON responses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = responses.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- PROFILES TABLE POLICIES
-- Users can only see their own profile
CREATE POLICY "profiles_user_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only insert their own profile
CREATE POLICY "profiles_user_insert" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "profiles_user_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own profile
CREATE POLICY "profiles_user_delete" ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Reset permissions to minimal required
REVOKE ALL ON surveys FROM PUBLIC;
REVOKE ALL ON responses FROM PUBLIC;
REVOKE ALL ON profiles FROM PUBLIC;

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON surveys TO authenticated;
GRANT INSERT ON responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

-- 7. Create function to test RLS (for debugging)
CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS TABLE(
  test_name text,
  result text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Test 1: Check if RLS is enabled
  RETURN QUERY
  SELECT 
    'RLS Status'::text,
    CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END::text,
    ('Table: ' || relname)::text
  FROM pg_class 
  WHERE relname IN ('surveys', 'responses', 'profiles')
  AND relnamespace = 'public'::regnamespace;
  
  -- Test 2: Count policies
  RETURN QUERY
  SELECT 
    'Policy Count'::text,
    COUNT(*)::text,
    ('Table: ' || tablename)::text
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('surveys', 'responses', 'profiles')
  GROUP BY tablename;
  
END;
$$;

-- 8. Add helpful comments
COMMENT ON TABLE surveys IS 'Surveys table with strict RLS - users can only access their own surveys';
COMMENT ON TABLE responses IS 'Responses table with RLS - users can only see responses to their own surveys';
COMMENT ON TABLE profiles IS 'Profiles table with RLS - users can only access their own profile';

-- 9. Create indexes for better RLS performance
CREATE INDEX IF NOT EXISTS idx_surveys_user_id_rls ON surveys(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_rls ON profiles(user_id) WHERE user_id IS NOT NULL;