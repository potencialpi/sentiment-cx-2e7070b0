-- Script para deletar usuários de teste do Supabase
-- ATENÇÃO: Este script irá deletar TODOS os dados dos usuários!
-- Use com cuidado e apenas em ambiente de desenvolvimento/teste

-- 1. Deletar respostas (responses)
-- As respostas serão deletadas automaticamente devido ao CASCADE nas foreign keys

-- 2. Deletar pesquisas (surveys)
-- As pesquisas serão deletadas automaticamente devido ao CASCADE nas foreign keys

-- 3. Deletar perfis (profiles)
-- Os perfis serão deletados automaticamente devido ao CASCADE nas foreign keys

-- 4. Deletar usuários da tabela auth.users
-- CUIDADO: Isso irá deletar TODOS os usuários!
-- Se você quiser deletar apenas usuários específicos, substitua por:
-- DELETE FROM auth.users WHERE email = 'email_especifico@exemplo.com';

-- Para deletar TODOS os usuários (use com extremo cuidado!):
DELETE FROM auth.users;

-- Alternativa: Deletar apenas usuários criados hoje
-- DELETE FROM auth.users WHERE DATE(created_at) = CURRENT_DATE;

-- Alternativa: Deletar usuários específicos por email
-- DELETE FROM auth.users WHERE email IN (
--   'usuario1@teste.com',
--   'usuario2@teste.com',
--   'usuario3@teste.com'
-- );

-- Verificar se a limpeza foi bem-sucedida
-- SELECT COUNT(*) as total_users FROM auth.users;
-- SELECT COUNT(*) as total_profiles FROM public.profiles;
-- SELECT COUNT(*) as total_surveys FROM public.surveys;
-- SELECT COUNT(*) as total_responses FROM public.responses;