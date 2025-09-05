-- Correção final das políticas RLS para tabela surveys
-- Eliminar completamente o acesso anônimo

-- 1. Remover todas as políticas existentes da tabela surveys
DROP POLICY IF EXISTS "surveys_select_policy" ON surveys;
DROP POLICY IF EXISTS "surveys_insert_policy" ON surveys;
DROP POLICY IF EXISTS "surveys_update_policy" ON surveys;
DROP POLICY IF EXISTS "surveys_delete_policy" ON surveys;
DROP POLICY IF EXISTS "Enable read access for all users" ON surveys;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON surveys;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON surveys;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON surveys;
DROP POLICY IF EXISTS "Allow public read access to active surveys" ON surveys;
DROP POLICY IF EXISTS "Allow authenticated users to read their own surveys" ON surveys;
DROP POLICY IF EXISTS "Allow authenticated users to insert surveys" ON surveys;
DROP POLICY IF EXISTS "Allow authenticated users to update their own surveys" ON surveys;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own surveys" ON surveys;

-- 2. Garantir que RLS está habilitado e forçado
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys FORCE ROW LEVEL SECURITY;

-- 3. Criar políticas restritivas que APENAS permitem acesso autenticado
-- SELECT: Apenas usuários autenticados podem ver seus próprios surveys
CREATE POLICY "surveys_authenticated_select" ON surveys
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- INSERT: Apenas usuários autenticados podem criar surveys
CREATE POLICY "surveys_authenticated_insert" ON surveys
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- UPDATE: Apenas usuários autenticados podem atualizar seus próprios surveys
CREATE POLICY "surveys_authenticated_update" ON surveys
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- DELETE: Apenas usuários autenticados podem deletar seus próprios surveys
CREATE POLICY "surveys_authenticated_delete" ON surveys
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 4. Revogar TODAS as permissões para role anon
REVOKE ALL ON surveys FROM anon;
REVOKE ALL ON surveys FROM public;

-- 5. Garantir permissões apenas para authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON surveys TO authenticated;

-- 6. Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'surveys'
ORDER BY policyname;

-- 7. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'surveys';

-- 8. Testar acesso anônimo (deve falhar)
-- Esta query deve retornar erro quando executada como anon
-- SELECT * FROM surveys LIMIT 1;

SELECT 'Políticas RLS para surveys atualizadas com sucesso!' as status;