-- Correção RLS: Remover acesso anônimo da tabela surveys
-- Execute este SQL no SQL Editor do Supabase

-- 1. Remover todas as políticas RLS existentes da tabela surveys
DROP POLICY IF EXISTS "surveys_select_policy" ON surveys;
DROP POLICY IF EXISTS "surveys_insert_policy" ON surveys;
DROP POLICY IF EXISTS "surveys_update_policy" ON surveys;
DROP POLICY IF EXISTS "surveys_delete_policy" ON surveys;
DROP POLICY IF EXISTS "Enable read access for all users" ON surveys;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON surveys;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON surveys;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON surveys;

-- 2. Garantir que RLS está habilitado
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS APENAS para usuários autenticados

-- Política de SELECT: Apenas usuários autenticados podem ver suas próprias surveys
CREATE POLICY "surveys_authenticated_select" ON surveys
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Política de INSERT: Apenas usuários autenticados podem criar surveys
CREATE POLICY "surveys_authenticated_insert" ON surveys
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Política de UPDATE: Apenas usuários autenticados podem atualizar suas próprias surveys
CREATE POLICY "surveys_authenticated_update" ON surveys
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política de DELETE: Apenas usuários autenticados podem deletar suas próprias surveys
CREATE POLICY "surveys_authenticated_delete" ON surveys
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Verificar se as políticas foram aplicadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'surveys'
ORDER BY policyname;

-- 5. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'surveys';

SELECT 'Políticas RLS aplicadas com sucesso - SEM acesso anônimo!' as status;