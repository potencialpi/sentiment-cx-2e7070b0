-- CORREÇÃO URGENTE: Políticas RLS para tabela surveys
-- O teste mostrou que usuários podem atualizar surveys de outros usuários
-- Isso é um problema crítico de segurança

-- 1. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can insert own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can update own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can delete own surveys" ON public.surveys;
DROP POLICY IF EXISTS "surveys_select_own" ON public.surveys;
DROP POLICY IF EXISTS "surveys_insert_own" ON public.surveys;
DROP POLICY IF EXISTS "surveys_update_own" ON public.surveys;
DROP POLICY IF EXISTS "surveys_delete_own" ON public.surveys;
DROP POLICY IF EXISTS "Public can view active surveys with links" ON public.surveys;
DROP POLICY IF EXISTS "Survey owners can view their surveys in public view" ON public.surveys;

-- 2. Garantir que RLS está habilitado
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys FORCE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS restritivas e corretas

-- SELECT: Usuários autenticados podem ver apenas seus próprios surveys
-- Usuários anônimos podem ver surveys ativos com unique_link (para responder)
CREATE POLICY "surveys_select_policy" ON public.surveys
  FOR SELECT
  USING (
    -- Usuários autenticados veem apenas seus surveys
    (auth.role() = 'authenticated' AND auth.uid() = user_id)
    OR
    -- Usuários anônimos veem apenas surveys ativos com link público
    (auth.role() = 'anon' AND status = 'active' AND unique_link IS NOT NULL)
    OR
    -- Service role tem acesso total
    (auth.role() = 'service_role')
  );

-- INSERT: Apenas usuários autenticados podem inserir surveys com seu próprio user_id
CREATE POLICY "surveys_insert_policy" ON public.surveys
  FOR INSERT
  WITH CHECK (
    -- Apenas usuários autenticados
    auth.role() = 'authenticated'
    AND
    -- Apenas com seu próprio user_id
    auth.uid() = user_id
  );

-- UPDATE: Apenas proprietários podem atualizar seus próprios surveys
CREATE POLICY "surveys_update_policy" ON public.surveys
  FOR UPDATE
  USING (
    -- Apenas usuários autenticados
    auth.role() = 'authenticated'
    AND
    -- Apenas seus próprios surveys
    auth.uid() = user_id
  )
  WITH CHECK (
    -- Garantir que não podem alterar o user_id
    auth.uid() = user_id
  );

-- DELETE: Apenas proprietários podem deletar seus próprios surveys
CREATE POLICY "surveys_delete_policy" ON public.surveys
  FOR DELETE
  USING (
    -- Apenas usuários autenticados
    auth.role() = 'authenticated'
    AND
    -- Apenas seus próprios surveys
    auth.uid() = user_id
  );

-- 4. Verificar se as políticas foram criadas
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'surveys'
ORDER BY policyname;

-- 5. Testar as políticas
-- Esta query deve retornar as 4 políticas criadas
SELECT COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'surveys';

SELECT 'Políticas RLS para surveys aplicadas com sucesso!' as status;