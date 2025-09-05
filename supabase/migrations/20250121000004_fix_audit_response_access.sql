-- Fix audit_response_access function to use correct column names
-- This migration fixes the 'operation' column reference error
-- Date: 2025-01-21
-- Priority: CRITICAL - Fixes runtime error

-- Drop and recreate the audit_response_access function with correct column names
CREATE OR REPLACE FUNCTION audit_response_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to response data for security monitoring
  -- Use 'event_type' instead of 'operation' to match current table structure
  INSERT INTO public.audit_log (table_name, event_type, user_id, record_id, created_at)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(NEW.id, OLD.id),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the fix
COMMENT ON FUNCTION audit_response_access IS 'Fixed audit function using event_type column instead of operation';

-- Log this migration
INSERT INTO public.audit_log (
    event_type,
    table_name,
    details,
    created_at
) VALUES (
    'MIGRATION',
    'audit_response_access',
    jsonb_build_object(
        'migration', '20250121000004_fix_audit_response_access',
        'description', 'Fixed audit_response_access function to use event_type instead of operation column',
        'fix', 'Changed INSERT statement to use event_type column matching current audit_log table structure'
    ),
    now()
);