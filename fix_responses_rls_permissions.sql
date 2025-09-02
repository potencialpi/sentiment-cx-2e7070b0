-- Fix RLS permissions for responses table
-- This script addresses the "permission denied for table responses" error (code 42501)

-- First, ensure RLS is enabled on the responses table
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Grant basic permissions to anon and authenticated roles
GRANT SELECT ON public.responses TO anon;
GRANT INSERT ON public.responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responses TO authenticated;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
DROP POLICY IF EXISTS "Users can view responses from own surveys" ON public.responses;
DROP POLICY IF EXISTS "anon_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "authenticated_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "responses_insert_policy" ON public.responses;
DROP POLICY IF EXISTS "responses_select_policy" ON public.responses;

-- Create comprehensive RLS policies for responses table

-- 1. Allow anonymous users (via magic link) to insert responses
CREATE POLICY "anon_can_insert_responses" ON public.responses
    FOR INSERT
    TO anon
    WITH CHECK (
        -- Allow insert if the survey exists and is active
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.status = 'active'
            AND surveys.unique_link IS NOT NULL
        )
    );

-- 2. Allow authenticated users to insert responses
CREATE POLICY "authenticated_can_insert_responses" ON public.responses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Allow insert if the survey exists and is active
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.status = 'active'
        )
    );

-- 3. Allow survey owners to view responses from their surveys
CREATE POLICY "owners_can_view_responses" ON public.responses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- 4. Allow survey owners to update/delete responses from their surveys
CREATE POLICY "owners_can_modify_responses" ON public.responses
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Verify the policies were created successfully
DO $$
BEGIN
    RAISE NOTICE 'RLS policies for responses table have been successfully updated!';
    RAISE NOTICE 'Permissions granted to anon and authenticated roles.';
END $$;

-- Check current permissions
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'responses' 
    AND grantee IN ('anon', 'authenticated') 
ORDER BY grantee, privilege_type;

SELECT 'RLS permissions for responses table fixed successfully!' as status;