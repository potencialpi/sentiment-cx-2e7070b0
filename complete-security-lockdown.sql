-- =====================================================
-- REMOÇÃO COMPLETA DE ACESSO ANÔNIMO - APLICAR NO SUPABASE SQL EDITOR
-- =====================================================
-- Este script remove completamente qualquer acesso anônimo do sistema
-- e implementa políticas RLS rigorosas para todas as tabelas

-- 1. REMOVER ACESSO ANÔNIMO DE TODAS AS FUNÇÕES
-- =====================================================

-- Revogar acesso da função exec_sql (se existir)
-- Nota: Algumas funções podem não existir, isso é normal
DO $$
BEGIN
    -- Tentar revogar acesso de exec_sql se existir
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'exec_sql' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        EXECUTE 'REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon';
        RAISE NOTICE 'Acesso anônimo removido da função exec_sql';
    ELSE
        RAISE NOTICE 'Função exec_sql não encontrada - OK';
    END IF;
    
    -- Tentar revogar acesso de query se existir
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'query' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        EXECUTE 'REVOKE ALL ON FUNCTION public.query(text) FROM anon';
        RAISE NOTICE 'Acesso anônimo removido da função query';
    ELSE
        RAISE NOTICE 'Função query não encontrada - OK';
    END IF;
END $$;

-- Revogar acesso de qualquer função personalizada
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL PROCEDURES IN SCHEMA public FROM anon;

-- 2. CONFIGURAR RLS PARA TABELA SURVEYS
-- =====================================================

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can insert own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete own surveys" ON surveys;
DROP POLICY IF EXISTS "Enable read access for all users" ON surveys;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON surveys;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON surveys;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can view own surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can insert surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can update own surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can delete own surveys" ON surveys;

-- Habilitar RLS
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Criar políticas apenas para usuários autenticados
CREATE POLICY "auth_users_select_own_surveys" ON surveys
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "auth_users_insert_surveys" ON surveys
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_users_update_own_surveys" ON surveys
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_users_delete_own_surveys" ON surveys
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 3. CONFIGURAR RLS PARA TABELA SURVEY_RESPONSES
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view responses to their surveys" ON survey_responses;
DROP POLICY IF EXISTS "Users can insert responses" ON survey_responses;
DROP POLICY IF EXISTS "Users can update their responses" ON survey_responses;
DROP POLICY IF EXISTS "Users can delete their responses" ON survey_responses;
DROP POLICY IF EXISTS "Enable read access for survey owners" ON survey_responses;
DROP POLICY IF EXISTS "Enable insert for all users" ON survey_responses;
DROP POLICY IF EXISTS "Enable update for response owners" ON survey_responses;
DROP POLICY IF EXISTS "Enable delete for response owners" ON survey_responses;

-- Habilitar RLS
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Políticas apenas para usuários autenticados
CREATE POLICY "auth_users_view_survey_responses" ON survey_responses
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = survey_responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

CREATE POLICY "auth_users_insert_responses" ON survey_responses
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = survey_responses.survey_id
        )
    );

CREATE POLICY "auth_users_update_own_responses" ON survey_responses
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "auth_users_delete_own_responses" ON survey_responses
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 4. CONFIGURAR RLS PARA TABELA SENTIMENT_ANALYSIS
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view sentiment for their surveys" ON sentiment_analysis;
DROP POLICY IF EXISTS "System can insert sentiment analysis" ON sentiment_analysis;
DROP POLICY IF EXISTS "Users can update sentiment analysis" ON sentiment_analysis;
DROP POLICY IF EXISTS "Users can delete sentiment analysis" ON sentiment_analysis;

-- Habilitar RLS
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;

-- Políticas apenas para usuários autenticados
CREATE POLICY "auth_users_view_sentiment_analysis" ON sentiment_analysis
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = sentiment_analysis.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

CREATE POLICY "system_insert_sentiment_analysis" ON sentiment_analysis
    FOR INSERT TO authenticated, service_role
    WITH CHECK (true);

CREATE POLICY "auth_users_update_sentiment_analysis" ON sentiment_analysis
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = sentiment_analysis.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

CREATE POLICY "auth_users_delete_sentiment_analysis" ON sentiment_analysis
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = sentiment_analysis.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- 5. CONFIGURAR RLS PARA TABELA USER_PLANS (se existir)
-- =====================================================

-- Verificar se a tabela existe e configurar RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_plans') THEN
        -- Remover políticas existentes
        DROP POLICY IF EXISTS "Users can view own plan" ON user_plans;
        DROP POLICY IF EXISTS "Users can update own plan" ON user_plans;
        DROP POLICY IF EXISTS "System can insert plans" ON user_plans;
        
        -- Habilitar RLS
        ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
        
        -- Criar políticas
        CREATE POLICY "auth_users_view_own_plan" ON user_plans
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());
            
        CREATE POLICY "system_manage_user_plans" ON user_plans
            FOR ALL TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- 6. REVOGAR TODOS OS PRIVILÉGIOS ANÔNIMOS EM TABELAS
-- =====================================================

-- Revogar acesso anônimo de todas as tabelas
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM anon;

-- Garantir que apenas usuários autenticados e service_role tenham acesso
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 7. CONFIGURAÇÕES DE SEGURANÇA ADICIONAIS
-- =====================================================

-- Desabilitar acesso direto a auth.users para anon
REVOKE ALL ON auth.users FROM anon;

-- Criar função para verificar se usuário está autenticado
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT auth.uid() IS NOT NULL;
$$;

-- Revogar acesso anônimo da função
REVOKE ALL ON FUNCTION public.is_authenticated() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated, service_role;

-- 8. CONFIGURAÇÃO DE AUDITORIA
-- =====================================================

-- Criar tabela de auditoria de segurança (se não existir)
CREATE TABLE IF NOT EXISTS security_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    table_name text,
    record_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS para auditoria
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_audit_access" ON security_audit_log
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_view_own_audit" ON security_audit_log
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar se RLS está habilitado em todas as tabelas principais
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Habilitado'
        ELSE '❌ RLS Desabilitado'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'survey_responses', 'sentiment_analysis', 'user_plans', 'security_audit_log')
ORDER BY tablename;

-- Listar políticas ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- INSTRUÇÕES DE APLICAÇÃO:
-- 1. Copie todo este script
-- 2. Vá para Supabase Dashboard > SQL Editor
-- 3. Cole e execute o script
-- 4. Verifique os resultados das consultas finais
-- 5. Execute o teste: node test-complete-security.cjs
-- =====================================================