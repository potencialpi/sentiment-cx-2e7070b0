-- SCRIPT PARA EXECUTAR NO PAINEL DO SUPABASE
-- Copie e cole este código no SQL Editor do Supabase Dashboard

-- 1. Verificar todas as tabelas existentes no schema public
SELECT 'TABELAS EXISTENTES NO SCHEMA PUBLIC:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Verificar estrutura da tabela profiles
SELECT '\n=== ESTRUTURA DA TABELA PROFILES ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da tabela companies
SELECT '\n=== ESTRUTURA DA TABELA COMPANIES ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'companies'
ORDER BY ordinal_position;

-- 4. Verificar estrutura da tabela surveys
SELECT '\n=== ESTRUTURA DA TABELA SURVEYS ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'surveys'
ORDER BY ordinal_position;

-- 5. Verificar estrutura da tabela questions
SELECT '\n=== ESTRUTURA DA TABELA QUESTIONS ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'questions'
ORDER BY ordinal_position;

-- 6. Verificar estrutura da tabela responses
SELECT '\n=== ESTRUTURA DA TABELA RESPONSES ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'responses'
ORDER BY ordinal_position;

-- 7. Verificar estrutura da tabela question_responses
SELECT '\n=== ESTRUTURA DA TABELA QUESTION_RESPONSES ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'question_responses'
ORDER BY ordinal_position;

-- 8. Verificar estrutura da tabela respondents
SELECT '\n=== ESTRUTURA DA TABELA RESPONDENTS ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'respondents'
ORDER BY ordinal_position;

-- 9. Verificar políticas RLS ativas
SELECT '\n=== POLÍTICAS RLS ATIVAS ===' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 10. Verificar se RLS está habilitado nas tabelas
SELECT '\n=== STATUS RLS DAS TABELAS ===' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 11. Verificar chaves estrangeiras
SELECT '\n=== CHAVES ESTRANGEIRAS ===' as info;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 12. Verificar índices existentes
SELECT '\n=== ÍNDICES EXISTENTES ===' as info;
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

SELECT '\n🎯 VERIFICAÇÃO COMPLETA DO SCHEMA SUPABASE!' as resultado;