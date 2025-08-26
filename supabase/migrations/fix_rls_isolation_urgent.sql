-- Correção Urgente das Políticas RLS para Isolamento Adequado dos Dados
-- Este script implementa políticas restritivas que garantem que cada usuário
-- acesse apenas seus próprios dados

-- Função para remover políticas existentes de forma segura
CREATE OR REPLACE FUNCTION drop_policy_if_exists(table_name text, policy_name text)
RETURNS void AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
EXCEPTION
    WHEN OTHERS THEN
        -- Ignora erros se a política não existir
        NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CORREÇÃO URGENTE: TABELA SURVEYS
-- ============================================================================

-- Remover todas as políticas existentes da tabela surveys
SELECT drop_policy_if_exists('surveys', 'surveys_select_policy');
SELECT drop_policy_if_exists('surveys', 'surveys_insert_policy');
SELECT drop_policy_if_exists('surveys', 'surveys_update_policy');
SELECT drop_policy_if_exists('surveys', 'surveys_delete_policy');
SELECT drop_policy_if_exists('surveys', 'Enable read access for all users');
SELECT drop_policy_if_exists('surveys', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('surveys', 'Enable update for users based on email');
SELECT drop_policy_if_exists('surveys', 'Enable delete for users based on email');

-- Garantir que RLS está habilitado
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- POLÍTICA CRÍTICA: SELECT - Usuários só veem seus próprios surveys
CREATE POLICY "surveys_select_own_only" ON surveys
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND 
        user_id = auth.uid()
    );

-- POLÍTICA CRÍTICA: INSERT - Usuários só podem inserir com seu próprio user_id
CREATE POLICY "surveys_insert_own_only" ON surveys
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        user_id = auth.uid()
    );

-- POLÍTICA CRÍTICA: UPDATE - Usuários só podem atualizar seus próprios surveys
CREATE POLICY "surveys_update_own_only" ON surveys
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND 
        user_id = auth.uid()
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        user_id = auth.uid()
    );

-- POLÍTICA CRÍTICA: DELETE - Usuários só podem deletar seus próprios surveys
CREATE POLICY "surveys_delete_own_only" ON surveys
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND 
        user_id = auth.uid()
    );

-- ============================================================================
-- CORREÇÃO: TABELA RESPONSES
-- ============================================================================

-- Remover políticas existentes da tabela responses
SELECT drop_policy_if_exists('responses', 'responses_select_policy');
SELECT drop_policy_if_exists('responses', 'responses_insert_policy');
SELECT drop_policy_if_exists('responses', 'responses_update_policy');
SELECT drop_policy_if_exists('responses', 'responses_delete_policy');
SELECT drop_policy_if_exists('responses', 'Enable read access for all users');
SELECT drop_policy_if_exists('responses', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('responses', 'Enable update for users based on email');
SELECT drop_policy_if_exists('responses', 'Enable delete for users based on email');

-- Garantir que RLS está habilitado
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários veem responses de seus próprios surveys
CREATE POLICY "responses_select_own_surveys" ON responses
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- INSERT: Responses só podem ser inseridas em surveys do próprio usuário
CREATE POLICY "responses_insert_own_surveys" ON responses
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- UPDATE: Usuários só podem atualizar responses de seus próprios surveys
CREATE POLICY "responses_update_own_surveys" ON responses
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- DELETE: Usuários só podem deletar responses de seus próprios surveys
CREATE POLICY "responses_delete_own_surveys" ON responses
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- ============================================================================
-- CORREÇÃO: TABELA PROFILES
-- ============================================================================

-- Remover políticas existentes da tabela profiles
SELECT drop_policy_if_exists('profiles', 'profiles_select_policy');
SELECT drop_policy_if_exists('profiles', 'profiles_insert_policy');
SELECT drop_policy_if_exists('profiles', 'profiles_update_policy');
SELECT drop_policy_if_exists('profiles', 'profiles_delete_policy');
SELECT drop_policy_if_exists('profiles', 'Enable read access for all users');
SELECT drop_policy_if_exists('profiles', 'Enable insert for authenticated users only');
SELECT drop_policy_if_exists('profiles', 'Enable update for users based on email');
SELECT drop_policy_if_exists('profiles', 'Enable delete for users based on email');

-- Garantir que RLS está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários só veem seu próprio perfil
CREATE POLICY "profiles_select_own_only" ON profiles
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND 
        id = auth.uid()
    );

-- INSERT: Usuários só podem inserir seu próprio perfil
CREATE POLICY "profiles_insert_own_only" ON profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        id = auth.uid()
    );

-- UPDATE: Usuários só podem atualizar seu próprio perfil
CREATE POLICY "profiles_update_own_only" ON profiles
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND 
        id = auth.uid()
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        id = auth.uid()
    );

-- DELETE: Usuários só podem deletar seu próprio perfil
CREATE POLICY "profiles_delete_own_only" ON profiles
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND 
        id = auth.uid()
    );

-- ============================================================================
-- CONFIGURAÇÃO DE PERMISSÕES PARA ROLES
-- ============================================================================

-- Revogar todas as permissões existentes
REVOKE ALL ON surveys FROM anon, authenticated;
REVOKE ALL ON responses FROM anon, authenticated;
REVOKE ALL ON profiles FROM anon, authenticated;

-- Conceder permissões mínimas necessárias para usuários autenticados
-- SURVEYS: Usuários autenticados podem fazer operações em seus próprios dados
GRANT SELECT, INSERT, UPDATE, DELETE ON surveys TO authenticated;

-- RESPONSES: Usuários autenticados podem fazer operações em responses de seus surveys
GRANT SELECT, INSERT, UPDATE, DELETE ON responses TO authenticated;

-- PROFILES: Usuários autenticados podem fazer operações em seu próprio perfil
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

-- IMPORTANTE: Usuários anônimos NÃO têm acesso a nenhuma tabela
-- Isso garante que apenas usuários autenticados possam acessar dados

-- ============================================================================
-- VERIFICAÇÃO DAS POLÍTICAS APLICADAS
-- ============================================================================

-- Verificar se as políticas foram criadas corretamente
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
WHERE tablename IN ('surveys', 'responses', 'profiles')
ORDER BY tablename, policyname;

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('surveys', 'responses', 'profiles')
AND schemaname = 'public';

-- Limpar função temporária
DROP FUNCTION IF EXISTS drop_policy_if_exists(text, text);

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

-- Esta correção urgente implementa:
-- 1. Isolamento completo de dados por usuário (user_id = auth.uid())
-- 2. Políticas restritivas que impedem acesso cruzado entre usuários
-- 3. Remoção de acesso para usuários anônimos
-- 4. Verificação de integridade das políticas aplicadas
--
-- RESULTADO ESPERADO:
-- - Cada usuário vê apenas seus próprios surveys
-- - Cada usuário vê apenas responses de seus próprios surveys
-- - Cada usuário vê apenas seu próprio perfil
-- - Usuários anônimos não têm acesso a dados
-- - Tentativas de acesso cruzado são bloqueadas pelo RLS