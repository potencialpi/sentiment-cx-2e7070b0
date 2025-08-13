-- Fix the security definer view issue by recreating the view without SECURITY DEFINER
-- This addresses the security linter warning while maintaining functionality

-- Drop the previous view
DROP VIEW IF EXISTS public.public_surveys;

-- Recreate the view without SECURITY DEFINER (default is SECURITY INVOKER which is safer)
CREATE VIEW public.public_surveys AS
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

-- Grant appropriate access
GRANT SELECT ON public.public_surveys TO anon;
GRANT SELECT ON public.public_surveys TO authenticated;