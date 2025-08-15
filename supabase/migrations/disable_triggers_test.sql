-- Desabilitar temporariamente os triggers para testar se eles estão causando o erro
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;

-- Log para confirmar que os triggers foram removidos
SELECT 'Triggers removidos para teste' as status;