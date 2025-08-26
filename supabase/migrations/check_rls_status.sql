-- Verificar se RLS está habilitado nas tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN '✅ Habilitado' ELSE '❌ Desabilitado' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles')
ORDER BY tablename;

-- Verificar políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles')
ORDER BY tablename, policyname;

-- Verificar permissões concedidas
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('surveys', 'responses', 'profiles')
ORDER BY table_name, grantee;