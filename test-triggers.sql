-- Teste para verificar se os triggers existem e estão funcionando

-- 1. Verificar se as funções existem
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user_profile', 'handle_new_user_company');

-- 2. Verificar se os triggers existem
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created_profile', 'on_auth_user_created_company');

-- 3. Verificar permissões nas tabelas
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('profiles', 'companies')
ORDER BY table_name, grantee;

-- 4. Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'companies');

-- 5. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'companies');

-- 6. Testar inserção manual (simulando o que o trigger deveria fazer)
-- INSERT INTO public.profiles (id, email, company_name, plan_id, billing_type)
-- VALUES ('test-user-id', 'test@example.com', 'Test Company', 'start-quantico', 'monthly');

-- INSERT INTO public.companies (id, name, plan_id, billing_type, owner_id)
-- VALUES (gen_random_uuid(), 'Test Company', 'start-quantico', 'monthly', 'test-user-id');