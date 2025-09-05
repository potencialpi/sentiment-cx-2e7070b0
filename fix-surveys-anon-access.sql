-- =====================================================
-- CORREÇÃO ESPECÍFICA: REMOVER ACESSO ANÔNIMO DA TABELA SURVEYS
-- =====================================================
-- Este script remove especificamente o acesso SELECT anônimo da tabela surveys

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================
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
AND tablename = 'surveys';

-- 2. VERIFICAR PRIVILÉGIOS ATUAIS
-- =====================================================
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'surveys'
AND grantee = 'anon';

-- 3. REVOGAR COMPLETAMENTE ACESSO ANÔNIMO
-- =====================================================

-- Revogar todos os privilégios da role anon na tabela surveys
REVOKE ALL PRIVILEGES ON TABLE public.surveys FROM anon;
REVOKE SELECT ON TABLE public.surveys FROM anon;
REVOKE INSERT ON TABLE public.surveys FROM anon;
REVOKE UPDATE ON TABLE public.surveys FROM anon;
REVOKE DELETE ON TABLE public.surveys FROM anon;
REVOKE REFERENCES ON TABLE public.surveys FROM anon;
REVOKE TRIGGER ON TABLE public.surveys FROM anon;
REVOKE TRUNCATE ON TABLE public.surveys FROM anon;

-- 4. GARANTIR QUE RLS ESTÁ HABILITADO
-- =====================================================
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- 5. REMOVER QUALQUER POLÍTICA QUE PERMITA ACESSO ANÔNIMO
-- =====================================================

-- Listar políticas atuais
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'surveys';

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can insert own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can update own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can delete own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.surveys;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.surveys;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.surveys;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can view own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can update own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can delete own surveys" ON public.surveys;
DROP POLICY IF EXISTS "auth_users_select_own_surveys" ON public.surveys;
DROP POLICY IF EXISTS "auth_users_insert_surveys" ON public.surveys;
DROP POLICY IF EXISTS "auth_users_update_own_surveys" ON public.surveys;
DROP POLICY IF EXISTS "auth_users_delete_own_surveys" ON public.surveys;

-- 6. CRIAR POLÍTICAS APENAS PARA USUÁRIOS AUTENTICADOS
-- =====================================================

-- Política para SELECT - apenas usuários autenticados podem ver suas próprias surveys
CREATE POLICY "authenticated_users_select_own_surveys" ON public.surveys
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Política para INSERT - apenas usuários autenticados podem inserir
CREATE POLICY "authenticated_users_insert_surveys" ON public.surveys
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE - apenas usuários autenticados podem atualizar suas próprias
CREATE POLICY "authenticated_users_update_own_surveys" ON public.surveys
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para DELETE - apenas usuários autenticados podem deletar suas próprias
CREATE POLICY "authenticated_users_delete_own_surveys" ON public.surveys
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 7. VERIFICAR CONFIGURAÇÃO FINAL
-- =====================================================

-- Verificar se RLS está habilitado
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
AND tablename = 'surveys';

-- Verificar privilégios após correção
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'surveys'
ORDER BY grantee, privilege_type;

-- Listar políticas ativas
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'surveys'
ORDER BY policyname;

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Verifique os resultados das consultas
-- 3. Execute: node test-complete-security.cjs
-- 4. Confirme que SELECT anônimo foi bloqueado
-- =====================================================