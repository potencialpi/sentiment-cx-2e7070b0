-- Script para corrigir políticas RLS da tabela responses
-- Execute este script no SQL Editor do Supabase
-- SCHEMA CORRETO: responses usa survey_id (não survey_unique_link)

-- 1. Remover políticas conflitantes (se existirem)
DROP POLICY IF EXISTS "public_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "owners_view_survey_responses" ON public.responses;
DROP POLICY IF EXISTS "anon_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "authenticated_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "owner_select_responses" ON public.responses;
DROP POLICY IF EXISTS "responses_insert_policy" ON public.responses;
DROP POLICY IF EXISTS "responses_select_policy" ON public.responses;
DROP POLICY IF EXISTS "allow_all_inserts" ON public.responses;
DROP POLICY IF EXISTS "owners_select_responses" ON public.responses;

-- 2. Habilitar RLS na tabela responses
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- 3. Criar política para INSERT público (anônimo e autenticado)
-- Permite inserir responses em surveys ativas com espaço disponível
CREATE POLICY "public_insert_responses" ON public.responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_id
      AND s.status = 'active'
      AND s.current_responses < s.max_responses
      AND s.unique_link IS NOT NULL
    )
  );

-- 4. Criar política para SELECT de proprietários
-- Permite que proprietários vejam responses de suas surveys
CREATE POLICY "owners_view_survey_responses" ON public.responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_id
      AND s.user_id = auth.uid()
    )
  );

-- 5. Verificar se as políticas foram criadas
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'responses'
ORDER BY policyname;

-- 6. Verificar se RLS está habilitado
SELECT 
  schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'responses';

-- 7. Testar as políticas (opcional)
-- Verificar se existem surveys ativas para teste
SELECT 
  id, title, status, unique_link, current_responses, max_responses
FROM public.surveys 
WHERE status = 'active' AND unique_link IS NOT NULL
LIMIT 3;