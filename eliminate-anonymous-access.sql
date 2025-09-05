-- SOLUÇÃO DEFINITIVA: Eliminar completamente o acesso anônimo
-- Esta migração garante que NUNCA haverá respondentes anônimos

-- 1. REVOGAR TODAS as permissões anônimas existentes
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 2. REMOVER políticas RLS que permitem acesso anônimo

-- Surveys: Remover acesso anônimo completamente
DROP POLICY IF EXISTS "surveys_select_policy" ON public.surveys;
CREATE POLICY "surveys_select_authenticated_only" ON public.surveys
  FOR SELECT
  USING (
    -- APENAS usuários autenticados podem ver seus próprios surveys
    auth.role() = 'authenticated' AND auth.uid() = user_id
  );

-- Responses: APENAS usuários autenticados
DROP POLICY IF EXISTS "responses_insert_policy" ON public.responses;
DROP POLICY IF EXISTS "responses_select_policy" ON public.responses;
DROP POLICY IF EXISTS "responses_update_policy" ON public.responses;

CREATE POLICY "responses_authenticated_only" ON public.responses
  FOR ALL
  USING (
    -- APENAS usuários autenticados
    auth.role() = 'authenticated'
  )
  WITH CHECK (
    -- APENAS usuários autenticados
    auth.role() = 'authenticated'
  );

-- Questions: APENAS usuários autenticados podem ver
DROP POLICY IF EXISTS "questions_select_policy" ON public.questions;
CREATE POLICY "questions_authenticated_only" ON public.questions
  FOR SELECT
  USING (
    -- APENAS usuários autenticados
    auth.role() = 'authenticated'
  );

-- Sentiment Analysis: APENAS usuários autenticados
DROP POLICY IF EXISTS "sentiment_analysis_policy" ON public.sentiment_analysis;
CREATE POLICY "sentiment_analysis_authenticated_only" ON public.sentiment_analysis
  FOR ALL
  USING (
    -- APENAS usuários autenticados
    auth.role() = 'authenticated'
  )
  WITH CHECK (
    -- APENAS usuários autenticados
    auth.role() = 'authenticated'
  );

-- 3. FORÇAR RLS em TODAS as tabelas
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys FORCE ROW LEVEL SECURITY;

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses FORCE ROW LEVEL SECURITY;

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_analysis FORCE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 4. CRIAR função para validar autenticação obrigatória
CREATE OR REPLACE FUNCTION public.require_authentication()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bloquear completamente acesso anônimo
  IF auth.role() = 'anon' THEN
    RAISE EXCEPTION 'Acesso negado: Autenticação obrigatória. Usuários anônimos não são permitidos.';
  END IF;
  
  -- Permitir apenas usuários autenticados e service_role
  RETURN auth.role() IN ('authenticated', 'service_role');
END;
$$;

-- 5. APLICAR validação em todas as tabelas críticas

-- Trigger para surveys
CREATE OR REPLACE FUNCTION public.validate_surveys_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.require_authentication();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS surveys_auth_trigger ON public.surveys;
CREATE TRIGGER surveys_auth_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.validate_surveys_auth();

-- Trigger para responses
CREATE OR REPLACE FUNCTION public.validate_responses_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.require_authentication();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS responses_auth_trigger ON public.responses;
CREATE TRIGGER responses_auth_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.validate_responses_auth();

-- 6. ATUALIZAR Edge Functions para rejeitar acesso anônimo
-- (Isso será feito no código da Edge Function)

-- 7. VERIFICAÇÃO FINAL
SELECT 
  'Acesso anônimo eliminado com sucesso!' as status,
  'Todas as operações agora requerem autenticação' as message;

-- Verificar políticas aplicadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;