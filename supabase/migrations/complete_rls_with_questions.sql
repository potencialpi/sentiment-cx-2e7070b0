-- Complete RLS Policies Including Questions Table
-- This migration ensures all survey-related tables have proper RLS policies

-- 1. Enable RLS on all tables
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies for questions table
DROP POLICY IF EXISTS "questions_select_own" ON questions;
DROP POLICY IF EXISTS "questions_insert_own" ON questions;
DROP POLICY IF EXISTS "questions_update_own" ON questions;
DROP POLICY IF EXISTS "questions_delete_own" ON questions;
DROP POLICY IF EXISTS "Anyone can view questions from active surveys" ON questions;
DROP POLICY IF EXISTS "Users can view questions from own surveys" ON questions;
DROP POLICY IF EXISTS "Users can insert questions to own surveys" ON questions;
DROP POLICY IF EXISTS "Users can update questions from own surveys" ON questions;
DROP POLICY IF EXISTS "Users can delete questions from own surveys" ON questions;

-- 3. Create RLS policies for questions table
-- Users can only see questions from their own surveys
CREATE POLICY "questions_select_own" ON questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = questions.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- Users can only insert questions to their own surveys
CREATE POLICY "questions_insert_own" ON questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = questions.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- Users can only update questions from their own surveys
CREATE POLICY "questions_update_own" ON questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = questions.survey_id 
      AND surveys.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = questions.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- Users can only delete questions from their own surveys
CREATE POLICY "questions_delete_own" ON questions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM surveys 
      WHERE surveys.id = questions.survey_id 
      AND surveys.user_id = auth.uid()
    )
  );

-- 4. Grant necessary permissions for questions table
-- Revoke all permissions first
REVOKE ALL ON questions FROM anon;
REVOKE ALL ON questions FROM authenticated;

-- Grant permissions to authenticated users (controlled by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON questions TO authenticated;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_survey_id ON questions(survey_id);

-- 6. Add comments for documentation
COMMENT ON POLICY "questions_select_own" ON questions IS 'Users can only see questions from their own surveys';
COMMENT ON POLICY "questions_insert_own" ON questions IS 'Users can only insert questions to their own surveys';
COMMENT ON POLICY "questions_update_own" ON questions IS 'Users can only update questions from their own surveys';
COMMENT ON POLICY "questions_delete_own" ON questions IS 'Users can only delete questions from their own surveys';

-- 7. Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'questions'
ORDER BY policyname;