-- LIMPEZA COMPLETA E RECRIAÇÃO DAS POLÍTICAS RLS
-- Este script remove todas as políticas existentes de forma segura

-- 1. Função para remover política se existir
CREATE OR REPLACE FUNCTION drop_policy_if_exists(policy_name text, table_name text)
RETURNS void AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
EXCEPTION
    WHEN OTHERS THEN
        -- Ignora erros se a política não existir
        NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. REMOVER TODAS AS POLÍTICAS POSSÍVEIS DA TABELA SURVEYS
SELECT drop_policy_if_exists('surveys_select_policy', 'surveys');
SELECT drop_policy_if_exists('surveys_insert_policy', 'surveys');
SELECT drop_policy_if_exists('surveys_update_policy', 'surveys');
SELECT drop_policy_if_exists('surveys_delete_policy', 'surveys');
SELECT drop_policy_if_exists('surveys_select_own_only', 'surveys');
SELECT drop_policy_if_exists('surveys_insert_own_only', 'surveys');
SELECT drop_policy_if_exists('surveys_update_own_only', 'surveys');
SELECT drop_policy_if_exists('surveys_delete_own_only', 'surveys');
SELECT drop_policy_if_exists('Enable read access for users based on user_id', 'surveys');
SELECT drop_policy_if_exists('Enable insert for authenticated users only', 'surveys');
SELECT drop_policy_if_exists('Enable update for users based on user_id', 'surveys');
SELECT drop_policy_if_exists('Enable delete for users based on user_id', 'surveys');

-- 3. REMOVER TODAS AS POLÍTICAS POSSÍVEIS DA TABELA RESPONSES
SELECT drop_policy_if_exists('responses_select_policy', 'responses');
SELECT drop_policy_if_exists('responses_insert_policy', 'responses');
SELECT drop_policy_if_exists('responses_update_policy', 'responses');
SELECT drop_policy_if_exists('responses_delete_policy', 'responses');
SELECT drop_policy_if_exists('responses_select_own_surveys', 'responses');
SELECT drop_policy_if_exists('responses_insert_anonymous', 'responses');
SELECT drop_policy_if_exists('responses_insert_authenticated', 'responses');

-- 4. REMOVER TODAS AS POLÍTICAS POSSÍVEIS DA TABELA PROFILES
SELECT drop_policy_if_exists('profiles_select_policy', 'profiles');
SELECT drop_policy_if_exists('profiles_insert_policy', 'profiles');
SELECT drop_policy_if_exists('profiles_update_policy', 'profiles');
SELECT drop_policy_if_exists('profiles_delete_policy', 'profiles');
SELECT drop_policy_if_exists('profiles_select_own_only', 'profiles');
SELECT drop_policy_if_exists('profiles_update_own_only', 'profiles');

-- 5. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. CRIAR NOVAS POLÍTICAS RESTRITIVAS PARA SURVEYS
CREATE POLICY "surveys_authenticated_select" ON public.surveys
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "surveys_authenticated_insert" ON public.surveys
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "surveys_authenticated_update" ON public.surveys
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "surveys_authenticated_delete" ON public.surveys
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 7. CRIAR POLÍTICAS PARA RESPONSES
CREATE POLICY "responses_authenticated_select" ON public.responses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

CREATE POLICY "responses_anon_insert" ON public.responses
    FOR INSERT
    TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = survey_id 
            AND surveys.status = 'active'
        )
    );

CREATE POLICY "responses_authenticated_insert" ON public.responses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = survey_id 
            AND surveys.status = 'active'
        )
    );

-- 8. CRIAR POLÍTICAS PARA PROFILES
CREATE POLICY "profiles_authenticated_select" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_authenticated_update" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 9. CONFIGURAR PERMISSÕES
REVOKE ALL ON public.surveys FROM anon, authenticated;
REVOKE ALL ON public.responses FROM anon, authenticated;
REVOKE ALL ON public.profiles FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT SELECT ON public.responses TO authenticated;
GRANT INSERT ON public.responses TO anon, authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- 10. REMOVER A FUNÇÃO AUXILIAR
DROP FUNCTION IF EXISTS drop_policy_if_exists(text, text);

-- 11. VERIFICAÇÃO FINAL
SELECT 
    'Políticas criadas para ' || tablename as resultado,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles')
GROUP BY tablename
ORDER BY tablename;