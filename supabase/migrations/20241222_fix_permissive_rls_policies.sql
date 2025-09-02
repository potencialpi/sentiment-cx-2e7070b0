-- Fix Permissive RLS Policies - Replace 'true' conditions with proper restrictions
-- Phase 2: HIGH-PRIORITY FIXES - Tighten RLS Policies

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
DROP POLICY IF EXISTS "Anyone can insert question responses" ON public.question_responses;

-- Create secure policies for responses table
-- Only allow inserts for valid survey participants via magic link sessions
CREATE POLICY "Authenticated users can insert responses" 
ON public.responses 
FOR INSERT 
WITH CHECK (
  -- Verificar se o usuário tem uma sessão válida para esta pesquisa
  EXISTS (
    SELECT 1 FROM public.respondent_sessions rs
    WHERE rs.survey_id = responses.survey_id
    AND rs.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
    AND rs.expires_at > now()
    AND rs.is_active = true
  )
  OR
  -- Permitir service_role para operações de backend
  current_setting('role') = 'service_role'
);

-- Allow users to read only their own survey responses
CREATE POLICY "Users can read own survey responses" 
ON public.responses 
FOR SELECT 
USING (
  -- Usuários podem ver respostas de suas próprias pesquisas
  EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = responses.survey_id
    AND s.user_id = auth.uid()
  )
  OR
  -- Service role tem acesso total
  current_setting('role') = 'service_role'
);

-- Create secure policies for question_responses table
-- Only allow inserts for valid survey participants
CREATE POLICY "Authenticated users can insert question responses" 
ON public.question_responses 
FOR INSERT 
WITH CHECK (
  -- Verificar se existe uma resposta válida associada
  EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.respondent_sessions rs ON rs.survey_id = r.survey_id
    WHERE r.id = question_responses.response_id
    AND rs.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
    AND rs.expires_at > now()
    AND rs.is_active = true
  )
  OR
  -- Permitir service_role para operações de backend
  current_setting('role') = 'service_role'
);

-- Allow users to read question responses from their own surveys
CREATE POLICY "Users can read own survey question responses" 
ON public.question_responses 
FOR SELECT 
USING (
  -- Usuários podem ver respostas de perguntas de suas próprias pesquisas
  EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.surveys s ON s.id = r.survey_id
    WHERE r.id = question_responses.response_id
    AND s.user_id = auth.uid()
  )
  OR
  -- Service role tem acesso total
  current_setting('role') = 'service_role'
);

-- Add audit logging for sensitive operations
CREATE OR REPLACE FUNCTION audit_response_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to response data for security monitoring
  INSERT INTO public.audit_log (table_name, operation, user_id, record_id, timestamp)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(auth.uid(), 'system'::uuid),
    COALESCE(NEW.id, OLD.id),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  operation text NOT NULL,
  user_id uuid,
  record_id uuid,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only service_role can access audit logs
CREATE POLICY "Service role only audit access" 
ON public.audit_log 
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- Add audit triggers
DROP TRIGGER IF EXISTS audit_responses_trigger ON public.responses;
CREATE TRIGGER audit_responses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.responses
  FOR EACH ROW EXECUTE FUNCTION audit_response_access();

DROP TRIGGER IF EXISTS audit_question_responses_trigger ON public.question_responses;
CREATE TRIGGER audit_question_responses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.question_responses
  FOR EACH ROW EXECUTE FUNCTION audit_response_access();

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.responses TO authenticated;
GRANT SELECT, INSERT ON public.question_responses TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

-- Add security comments
COMMENT ON POLICY "Authenticated users can insert responses" ON public.responses IS 
'Security: Only allows response insertion for users with valid magic link sessions';

COMMENT ON POLICY "Users can read own survey responses" ON public.responses IS 
'Security: Users can only access responses from their own surveys';

COMMENT ON POLICY "Authenticated users can insert question responses" ON public.question_responses IS 
'Security: Only allows question response insertion for users with valid sessions';

COMMENT ON POLICY "Users can read own survey question responses" ON public.question_responses IS 
'Security: Users can only access question responses from their own surveys';

COMMENT ON TABLE public.audit_log IS 
'Security: Audit trail for sensitive operations - service_role access only';