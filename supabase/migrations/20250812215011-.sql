-- Force refresh of the public_surveys view to ensure it's properly configured
-- This ensures the view is created without SECURITY DEFINER property

DROP VIEW IF EXISTS public.public_surveys;

-- Recreate the view with proper configuration (SECURITY INVOKER is default)
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

-- Ensure proper permissions
GRANT SELECT ON public.public_surveys TO anon;
GRANT SELECT ON public.public_surveys TO authenticated;