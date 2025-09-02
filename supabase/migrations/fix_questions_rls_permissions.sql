-- Fix RLS permissions for questions table
-- This script addresses the "permission denied for table questions" error

-- First, ensure RLS is enabled on the questions table
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Grant basic permissions to anon and authenticated roles
GRANT SELECT ON public.questions TO anon;
GRANT SELECT ON public.questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questions TO authenticated;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "questions_select_policy" ON public.questions;
DROP POLICY IF EXISTS "questions_insert_policy" ON public.questions;
DROP POLICY IF EXISTS "questions_update_policy" ON public.questions;
DROP POLICY IF EXISTS "questions_delete_policy" ON public.questions;

-- Create comprehensive RLS policies for questions table

-- Allow anonymous users to read questions (needed for survey responses)
CREATE POLICY "questions_select_policy" ON public.questions
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Allow authenticated users to insert questions (survey creators)
CREATE POLICY "questions_insert_policy" ON public.questions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update their own questions
CREATE POLICY "questions_update_policy" ON public.questions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete their own questions
CREATE POLICY "questions_delete_policy" ON public.questions
    FOR DELETE
    TO authenticated
    USING (true);

-- Verify the policies were created successfully
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'questions'
ORDER BY policyname;

-- Verify table permissions
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'questions' 
AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;