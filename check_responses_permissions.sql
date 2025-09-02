-- Script para verificar permissões da tabela responses
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Verificar se RLS está habilitado na tabela responses
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN 'RLS HABILITADO' ELSE 'RLS DESABILITADO' END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'responses';

-- 2. Verificar permissões das roles anon e authenticated na tabela responses
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'responses' 
    AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- 3. Verificar políticas RLS atuais na tabela responses
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
WHERE schemaname = 'public' AND tablename = 'responses'
ORDER BY policyname;

-- 4. Verificar se existem conflitos de políticas
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'responses' AND cmd = 'INSERT';
    
    RAISE NOTICE 'Número de políticas INSERT na tabela responses: %', policy_count;
    
    IF policy_count > 1 THEN
        RAISE NOTICE 'ATENÇÃO: Múltiplas políticas INSERT podem causar conflitos!';
    END IF;
END $$;

-- 5. Testar se a role anon pode inserir na tabela responses
-- (Este teste só funcionará se executado com a role anon)
SELECT 'Verificação de permissões concluída!' as resultado;