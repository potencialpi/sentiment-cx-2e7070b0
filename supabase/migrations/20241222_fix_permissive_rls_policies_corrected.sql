-- Fix permissive RLS policies for responses and question_responses tables
-- This migration replaces overly permissive 'true' conditions with proper security checks

-- Drop existing permissive policies for responses table
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
DROP POLICY IF EXISTS "Users can insert responses" ON public.responses;

-- Create secure policy for responses insertion
-- Only allow insertion via magic link validation or service role
CREATE POLICY "Secure responses insertion" ON public.responses
  FOR INSERT
  WITH CHECK (
    -- Allow service role full access
    auth.role() = 'service_role'
    OR
    -- Allow insertion if there's a valid magic link for the survey
    EXISTS (
      SELECT 1 FROM public.magic_links ml
      WHERE ml.survey_id = responses.survey_id
      AND ml.expires_at > now()
      AND ml.used_at IS NULL
    )
  );

-- Drop existing permissive policies for question_responses table
DROP POLICY IF EXISTS "Anyone can insert question responses" ON public.question_responses;
DROP POLICY IF EXISTS "Users can insert question responses" ON public.question_responses;

-- Create secure policy for question_responses insertion
-- Only allow insertion via magic link validation or service role
CREATE POLICY "Secure question responses insertion" ON public.question_responses
  FOR INSERT
  WITH CHECK (
    -- Allow service role full access
    auth.role() = 'service_role'
    OR
    -- Allow insertion if there's a valid magic link for the associated survey
    EXISTS (
      SELECT 1 FROM public.responses r
      JOIN public.magic_links ml ON ml.survey_id = r.survey_id
      WHERE r.id = question_responses.response_id
      AND ml.expires_at > now()
      AND ml.used_at IS NULL
    )
  );

-- Add audit logging function for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_event_type text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.audit_log (
    event_type,
    table_name,
    record_id,
    user_id,
    details,
    created_at
  ) VALUES (
    p_event_type,
    p_table_name,
    p_record_id,
    auth.uid(),
    p_details,
    now()
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.log_sensitive_access TO authenticated, anon;

-- Add comments for security documentation
COMMENT ON POLICY "Secure responses insertion" ON public.responses IS 
  'Security Policy: Restricts response insertion to valid magic link sessions or service role. Replaces permissive true condition.';

COMMENT ON POLICY "Secure question responses insertion" ON public.question_responses IS 
  'Security Policy: Restricts question response insertion to valid magic link sessions or service role. Replaces permissive true condition.';

COMMENT ON FUNCTION public.log_sensitive_access IS 
  'Audit Function: Logs access to sensitive data for security monitoring and compliance.';

-- Log this security fix
SELECT public.log_sensitive_access(
  'SECURITY_FIX',
  'rls_policies',
  NULL,
  jsonb_build_object(
    'action', 'fix_permissive_policies',
    'tables', ARRAY['responses', 'question_responses'],
    'description', 'Replaced permissive true conditions with secure magic link validation'
  )
);