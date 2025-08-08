-- Função RPC para deletar todos os usuários
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- 1. Criar função para deletar todos os usuários
CREATE OR REPLACE FUNCTION delete_all_auth_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count integer;
  result json;
BEGIN
  -- Contar usuários antes da deleção
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- Deletar todos os usuários (CASCADE irá deletar dados relacionados)
  DELETE FROM auth.users;
  
  -- Retornar resultado
  result := json_build_object(
    'success', true,
    'deleted_users', user_count,
    'message', 'Todos os usuários foram deletados com sucesso'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao deletar usuários'
    );
END;
$$;

-- 2. Dar permissões para a função
GRANT EXECUTE ON FUNCTION delete_all_auth_users() TO anon;
GRANT EXECUTE ON FUNCTION delete_all_auth_users() TO authenticated;

-- 3. Função para verificar contagem de registros
CREATE OR REPLACE FUNCTION get_user_counts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'auth_users', (SELECT COUNT(*) FROM auth.users),
    'profiles', (SELECT COUNT(*) FROM public.profiles),
    'surveys', (SELECT COUNT(*) FROM public.surveys),
    'responses', (SELECT COUNT(*) FROM public.responses)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Dar permissões para a função de contagem
GRANT EXECUTE ON FUNCTION get_user_counts() TO anon;
GRANT EXECUTE ON FUNCTION get_user_counts() TO authenticated;

-- 4. Executar a deleção (descomente a linha abaixo para executar)
-- SELECT delete_all_auth_users();

-- 5. Verificar resultado (descomente para verificar)
-- SELECT get_user_counts();