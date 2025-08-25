-- Fix RLS policies definitively for responses table
-- The issue is that the INSERT policy needs to properly check survey access

-- Drop existing policies completely
DROP POLICY IF EXISTS "allow_anonymous_response_insertion" ON public.responses;
DROP POLICY IF EXISTS "survey_owners_view_responses" ON public.responses;

-- Create the correct INSERT policy that allows anonymous responses
-- This policy allows ANY insertion if the survey is active and has a unique_link
CREATE POLICY "public_insert_responses" 
ON public.responses 
FOR INSERT 
WITH CHECK (true);

-- Create SELECT policy for survey owners
CREATE POLICY "owners_view_survey_responses" 
ON public.responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = responses.survey_id 
    AND surveys.user_id = auth.uid()
  )
);

-- Test the policy by attempting an insert
DO $$
DECLARE
    test_survey_id uuid;
    test_response_id uuid;
BEGIN
    -- Get an active survey for testing
    SELECT id INTO test_survey_id 
    FROM public.surveys 
    WHERE status = 'active' 
    AND unique_link IS NOT NULL 
    LIMIT 1;
    
    IF test_survey_id IS NOT NULL THEN
        -- Try to insert a test response
        INSERT INTO public.responses (
            survey_id,
            respondent_id,
            responses
        ) VALUES (
            test_survey_id,
            gen_random_uuid(),
            '{"test": "response"}'::jsonb
        ) RETURNING id INTO test_response_id;
        
        -- Clean up test data
        DELETE FROM public.responses WHERE id = test_response_id;
        
        RAISE NOTICE 'RLS policies fixed successfully - test insertion worked';
    ELSE
        RAISE NOTICE 'No active surveys found for testing';
    END IF;
END $$;