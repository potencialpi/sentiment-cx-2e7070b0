-- Implement audit triggers for sensitive operations
-- This migration creates automatic audit logging for critical tables

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  audit_details jsonb;
  event_type_name text;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type_name := 'INSERT';
    audit_details := jsonb_build_object(
      'operation', 'INSERT',
      'table', TG_TABLE_NAME,
      'new_data', to_jsonb(NEW),
      'timestamp', now()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    event_type_name := 'UPDATE';
    audit_details := jsonb_build_object(
      'operation', 'UPDATE',
      'table', TG_TABLE_NAME,
      'old_data', to_jsonb(OLD),
      'new_data', to_jsonb(NEW),
      'timestamp', now()
    );
  ELSIF TG_OP = 'DELETE' THEN
    event_type_name := 'DELETE';
    audit_details := jsonb_build_object(
      'operation', 'DELETE',
      'table', TG_TABLE_NAME,
      'old_data', to_jsonb(OLD),
      'timestamp', now()
    );
  END IF;

  -- Insert audit record
  INSERT INTO public.audit_log (
    event_type,
    table_name,
    record_id,
    user_id,
    details,
    created_at
  ) VALUES (
    event_type_name,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    audit_details,
    now()
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create audit triggers for checkout_sessions (payment data)
DROP TRIGGER IF EXISTS audit_checkout_sessions_trigger ON public.checkout_sessions;
CREATE TRIGGER audit_checkout_sessions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Create audit triggers for responses (survey data)
DROP TRIGGER IF EXISTS audit_responses_trigger ON public.responses;
CREATE TRIGGER audit_responses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Create audit triggers for question_responses (detailed survey data)
DROP TRIGGER IF EXISTS audit_question_responses_trigger ON public.question_responses;
CREATE TRIGGER audit_question_responses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.question_responses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Create audit triggers for magic_links (authentication data)
DROP TRIGGER IF EXISTS audit_magic_links_trigger ON public.magic_links;
CREATE TRIGGER audit_magic_links_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.magic_links
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Create audit triggers for profiles (user data)
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.audit_trigger_function TO authenticated, anon;

-- Add security comments
COMMENT ON FUNCTION public.audit_trigger_function IS 
  'Security Function: Automatically logs all operations on sensitive tables for compliance and monitoring.';

COMMENT ON TRIGGER audit_checkout_sessions_trigger ON public.checkout_sessions IS 
  'Security Trigger: Logs all payment data operations for LGPD/GDPR compliance.';

COMMENT ON TRIGGER audit_responses_trigger ON public.responses IS 
  'Security Trigger: Logs all survey response operations for data protection compliance.';

COMMENT ON TRIGGER audit_question_responses_trigger ON public.question_responses IS 
  'Security Trigger: Logs all detailed survey response operations for audit trail.';

COMMENT ON TRIGGER audit_magic_links_trigger ON public.magic_links IS 
  'Security Trigger: Logs all authentication link operations for security monitoring.';

COMMENT ON TRIGGER audit_profiles_trigger ON public.profiles IS 
  'Security Trigger: Logs all user profile operations for data protection compliance.';

-- Log this security implementation
SELECT public.log_sensitive_access(
  'SECURITY_IMPLEMENTATION',
  'audit_system',
  NULL,
  jsonb_build_object(
    'action', 'implement_audit_triggers',
    'tables', ARRAY['checkout_sessions', 'responses', 'question_responses', 'magic_links', 'profiles'],
    'description', 'Implemented comprehensive audit logging for sensitive operations',
    'compliance', ARRAY['LGPD', 'GDPR']
  )
);