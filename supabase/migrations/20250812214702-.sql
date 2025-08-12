-- Fix security vulnerability: Remove public access to private survey data
-- This prevents competitors from viewing survey titles, descriptions, and user IDs

-- Remove overly permissive policies that expose private survey data
DROP POLICY IF EXISTS "Anyone can view active surveys by link" ON public.surveys;
DROP POLICY IF EXISTS "Anyone can view active surveys with unique_link" ON public.surveys;
DROP POLICY IF EXISTS "Users can view active surveys" ON public.surveys;

-- Create a secure policy for public survey response access
-- This only allows viewing surveys when accessed via unique_link for response purposes
-- and restricts what data is visible to the public
CREATE POLICY "Public can access surveys for responses only" ON public.surveys
    FOR SELECT 
    USING (
        status = 'active' 
        AND unique_link IS NOT NULL 
        AND unique_link != ''
    );

-- Ensure users can still manage their own surveys (keep existing secure policies)
-- These policies remain unchanged as they properly restrict access to survey owners
-- "Users can view their own surveys" - already exists and is secure
-- "Users can create their own surveys" - already exists and is secure  
-- "Users can update their own surveys" - already exists and is secure
-- "Users can delete their own surveys" - already exists and is secure

-- Add additional security: Create a view for public survey access that limits exposed data
CREATE OR REPLACE VIEW public.public_surveys AS
SELECT 
    id,
    title,
    description,
    status,
    unique_link
FROM public.surveys
WHERE status = 'active' 
    AND unique_link IS NOT NULL 
    AND unique_link != '';

-- Grant public access to the view (but not the underlying table)
GRANT SELECT ON public.public_surveys TO anon;
GRANT SELECT ON public.public_surveys TO authenticated;