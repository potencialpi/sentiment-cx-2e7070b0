-- Fix RLS policies for responses table to allow anonymous responses
-- This ensures respondents can submit responses to any active survey

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "public_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "owners_view_survey_responses" ON public.responses;

-- Create improved policy for anonymous response insertion
-- This allows anyone to insert responses, which is needed for public surveys
CREATE POLICY "allow_anonymous_response_insertion" 
ON public.responses 
FOR INSERT 
WITH CHECK (
  -- Allow insertion if the survey exists and is active
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = survey_id 
    AND status = 'active'
    AND unique_link IS NOT NULL
  )
);

-- Create policy for survey owners to view their responses
-- This uses a cleaner approach to check ownership
CREATE POLICY "survey_owners_view_responses" 
ON public.responses 
FOR SELECT 
USING (
  -- Allow if user owns the survey
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = survey_id 
    AND user_id = auth.uid()
  )
);

-- Ensure RLS is enabled on responses table
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;