-- Verificar se o trigger handle_new_user_company existe e está ativo
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created_company';

-- Verificar se a função handle_new_user_company existe
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_company';

-- Verificar permissões nas tabelas profiles e companies
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'companies')
    AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;