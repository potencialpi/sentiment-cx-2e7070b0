-- Fix audit_log table structure
-- This migration ensures the audit_log table has the correct structure
-- and fixes any references to non-existent columns

-- 1. Ensure audit_log table exists with correct structure
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS if not already enabled
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "users_view_own_audit_logs" ON public.audit_log;
DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_log;
DROP POLICY IF EXISTS "audit_logs_own_access" ON public.audit_log;

-- 4. Create comprehensive RLS policies
-- Policy for users to view their own audit logs
CREATE POLICY "users_view_own_audit_logs" ON public.audit_log
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy for admins to view all audit logs
CREATE POLICY "admin_view_all_audit_logs" ON public.audit_log
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND subscription_plan IN ('nexus_infinito')
        )
    );

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON public.audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

-- 6. Grant necessary permissions
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO service_role;
GRANT SELECT ON public.audit_log TO service_role;
GRANT UPDATE ON public.audit_log TO service_role;
GRANT DELETE ON public.audit_log TO service_role;

-- 7. Create or replace the audit trigger function with correct structure
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

  -- Insert audit record with correct column names
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

-- 8. Log this migration
INSERT INTO public.audit_log (
    event_type,
    table_name,
    details,
    created_at
) VALUES (
    'MIGRATION',
    'audit_log',
    jsonb_build_object(
        'migration', '20250121000001_fix_audit_log_structure',
        'description', 'Fixed audit_log table structure and column references',
        'changes', ARRAY[
            'Ensured correct table structure',
            'Fixed RLS policies',
            'Updated audit trigger function',
            'Added proper indexes and permissions'
        ]
    ),
    now()
);

COMMENT ON TABLE public.audit_log IS 'Audit log table for tracking system events and changes';
COMMENT ON COLUMN public.audit_log.event_type IS 'Type of event (INSERT, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN public.audit_log.details IS 'JSONB field containing operation details and data changes';