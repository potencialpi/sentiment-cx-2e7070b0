-- Fix anonymous access to surveys table for respondents
-- This allows anonymous users to read surveys but maintains isolation between authenticated users

-- Add policy to allow anonymous users to read surveys
CREATE POLICY "Allow anonymous read access to surveys" ON public.surveys
    FOR SELECT
    TO anon
    USING (true);

-- Grant SELECT permission to anon role for surveys table
GRANT SELECT ON public.surveys TO anon;

-- Also need to allow anonymous access to questions table for survey responses
CREATE POLICY "Allow anonymous read access to questions" ON public.questions
    FOR SELECT
    TO anon
    USING (true);

-- Grant SELECT permission to anon role for questions table
GRANT SELECT ON public.questions TO anon;

-- Allow anonymous users to insert responses
CREATE POLICY "Allow anonymous insert responses" ON public.responses
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Grant INSERT permission to anon role for responses table
GRANT INSERT ON public.responses TO anon;

-- Verify current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('surveys', 'questions', 'responses')
ORDER BY tablename, policyname;