-- Verificar políticas RLS atuais para as tabelas problemáticas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN ('responses', 'questions', 'question_responses') 
ORDER BY tablename, policyname;

-- Verificar permissões das tabelas para os roles anon e authenticated
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated') 
    AND table_name IN ('responses', 'questions', 'question_responses')
ORDER BY table_name, grantee;

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('responses', 'questions', 'question_responses');