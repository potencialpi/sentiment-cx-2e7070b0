-- FORÇAR CORREÇÃO DAS POLÍTICAS RLS
-- Este script remove todas as políticas existentes e recria com configurações corretas

-- 1. DESABILITAR RLS temporariamente para limpeza
ALTER TABLE public.surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "surveys_select_policy" ON public.surveys;
DROP POLICY IF EXISTS "surveys_insert_policy" ON public.surveys;
DROP POLICY IF EXISTS "surveys_update_policy" ON public.surveys;
DROP POLICY IF EXISTS "surveys_delete_policy" ON public.surveys;

DROP POLICY IF EXISTS "responses_select_policy" ON public.responses;
DROP POLICY IF EXISTS "responses_insert_policy" ON public.responses;
DROP POLICY IF EXISTS "responses_update_policy" ON public.responses;
DROP POLICY IF EXISTS "responses_delete_policy" ON public.responses;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Remover políticas com nomes alternativos que possam existir
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.surveys;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.surveys;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.surveys;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.surveys;

-- 3. REABILITAR RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS RESTRITIVAS PARA SURVEYS
-- Usuários autenticados só podem ver seus próprios surveys
CREATE POLICY "surveys_select_own_only" ON public.surveys
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Usuários autenticados só podem inserir surveys para si mesmos
CREATE POLICY "surveys_insert_own_only" ON public.surveys
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Usuários autenticados só podem atualizar seus próprios surveys
CREATE POLICY "surveys_update_own_only" ON public.surveys
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Usuários autenticados só podem deletar seus próprios surveys
CREATE POLICY "surveys_delete_own_only" ON public.surveys
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. CRIAR POLÍTICAS PARA RESPONSES
-- Usuários autenticados podem ver responses de seus surveys
CREATE POLICY "responses_select_own_surveys" ON public.responses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Usuários anônimos podem inserir responses em surveys ativos
CREATE POLICY "responses_insert_anonymous" ON public.responses
    FOR INSERT
    TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = survey_id 
            AND surveys.status = 'active'
        )
    );

-- Usuários autenticados podem inserir responses em surveys ativos
CREATE POLICY "responses_insert_authenticated" ON public.responses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = survey_id 
            AND surveys.status = 'active'
        )
    );

-- 6. CRIAR POLÍTICAS PARA PROFILES
-- Usuários só podem ver e editar seu próprio perfil
CREATE POLICY "profiles_select_own_only" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own_only" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 7. GARANTIR PERMISSÕES BÁSICAS
-- Revogar todas as permissões existentes
REVOKE ALL ON public.surveys FROM anon, authenticated;
REVOKE ALL ON public.responses FROM anon, authenticated;
REVOKE ALL ON public.profiles FROM anon, authenticated;

-- Conceder apenas as permissões necessárias
-- Para surveys: authenticated pode fazer tudo, anon não pode fazer nada
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;

-- Para responses: ambos podem inserir, authenticated pode selecionar
GRANT SELECT ON public.responses TO authenticated;
GRANT INSERT ON public.responses TO anon, authenticated;

-- Para profiles: authenticated pode selecionar e atualizar
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- 8. VERIFICAÇÃO FINAL
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles');

SELECT 
    'Policies Count' as check_type,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles')
GROUP BY tablename;