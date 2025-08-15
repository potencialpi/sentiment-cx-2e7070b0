-- Secure the public_surveys view by recreating it with proper permissions
-- First drop the existing view and recreate it securely

DROP VIEW IF EXISTS public.public_surveys;

-- Create a more secure public_surveys view that only shows active surveys with unique links
CREATE VIEW public.public_surveys AS 
SELECT 
  id,
  title,
  description,
  unique_link,
  status
FROM public.surveys 
WHERE status = 'active' 
  AND unique_link IS NOT NULL 
  AND unique_link != '';

-- Grant limited permissions only to anon and authenticated roles
GRANT SELECT ON public.public_surveys TO anon;
GRANT SELECT ON public.public_surveys TO authenticated;

-- Revoke all other permissions to ensure data protection
REVOKE ALL ON public.public_surveys FROM public;

-- Add comment to document the security approach
COMMENT ON VIEW public.public_surveys IS 'Public view for active surveys with unique links only. Limited to SELECT operations for anon and authenticated users.';

-- Verify the view is properly secured
SELECT viewname, definition 
FROM pg_views 
WHERE schemaname = 'public' AND viewname = 'public_surveys';