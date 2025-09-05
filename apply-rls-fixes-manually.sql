-- =====================================================
-- APLICAR NO SUPABASE SQL EDITOR MANUALMENTE
-- =====================================================
-- Este script corrige as políticas RLS da tabela surveys
-- para remover completamente o acesso anônimo

-- 1. Remover todas as políticas RLS existentes da tabela surveys
DROP POLICY IF EXISTS "Users can view own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can insert own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete own surveys" ON surveys;
DROP POLICY IF EXISTS "Enable read access for all users" ON surveys;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON surveys;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON surveys;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON surveys;

-- 2. Criar novas políticas RLS que permitem acesso APENAS para usuários autenticados
-- SELECT: Usuários autenticados podem ver apenas suas próprias surveys
CREATE POLICY "Authenticated users can view own surveys" ON surveys
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- INSERT: Usuários autenticados podem criar surveys
CREATE POLICY "Authenticated users can insert surveys" ON surveys
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuários autenticados podem atualizar apenas suas próprias surveys
CREATE POLICY "Authenticated users can update own surveys" ON surveys
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuários autenticados podem deletar apenas suas próprias surveys
CREATE POLICY "Authenticated users can delete own surveys" ON surveys
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 3. Garantir que RLS está habilitado
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INSTRUÇÕES:
-- 1. Copie todo este conteúdo
-- 2. Vá para o Supabase Dashboard > SQL Editor
-- 3. Cole o código e execute
-- 4. Verifique se não há erros
-- =====================================================