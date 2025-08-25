-- CORREÇÃO RLS: Resolver conflito de políticas na tabela responses
-- O problema é que temos políticas redundantes e conflitantes que impedem inserções anônimas

-- Remover políticas conflitantes existentes
DROP POLICY IF EXISTS "anon_role_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "allow_anonymous_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "authenticated_insert_responses" ON public.responses;

-- Criar uma política única e clara para inserções de respostas
-- Permite que qualquer pessoa (anônima ou autenticada) insira respostas em surveys ativas
CREATE POLICY "public_insert_responses" 
ON public.responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = responses.survey_id 
      AND surveys.status = 'active'
      AND surveys.unique_link IS NOT NULL
      AND surveys.current_responses < surveys.max_responses
  )
);

-- Manter política de seleção para proprietários (já existente)
-- Esta política permite que donos das surveys vejam as respostas
DROP POLICY IF EXISTS "owners_view_survey_responses" ON public.responses;
CREATE POLICY "owners_view_survey_responses" 
ON public.responses 
FOR SELECT 
TO authenticated
USING (
  survey_id IN (
    SELECT surveys.id
    FROM surveys
    WHERE surveys.user_id = auth.uid()
  )
);

-- Adicionar comentários para documentar as políticas
COMMENT ON POLICY "public_insert_responses" ON public.responses IS 'Permite inserção de respostas por usuários anônimos e autenticados em surveys ativas com unique_link';
COMMENT ON POLICY "owners_view_survey_responses" ON public.responses IS 'Permite que proprietários de surveys vejam as respostas de suas pesquisas';