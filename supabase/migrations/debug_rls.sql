-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles');

-- Verificar políticas existentes
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
AND tablename IN ('surveys', 'responses', 'profiles')
ORDER BY tablename, policyname;

-- Verificar permissões das roles
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('surveys', 'responses', 'profiles')
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;

-- Testar uma consulta específica como usuário autenticado
-- Esta consulta deve retornar apenas surveys do usuário logado
SELECT 
    'Teste de política RLS para surveys' as teste,
    count(*) as total_surveys
FROM surveys;

-- Verificar se existe alguma função ou trigger que possa estar interferindo
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%survey%'
OR routine_definition LIKE '%surveys%';

-- Verificar triggers na tabela surveys
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'surveys'
AND event_object_schema = 'public';