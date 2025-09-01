-- Bootstrap: Criar função RPC public.exec_sql para permitir execução segura de SQL
-- Execute este SQL no SQL Editor do Supabase uma única vez

-- Criar schema utils se não existir
CREATE SCHEMA IF NOT EXISTS utils;

-- Criar função utilitária segura
CREATE OR REPLACE FUNCTION utils.exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql;
  result := json_build_object('status', 'ok');
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object('status', 'error', 'message', SQLERRM);
  RETURN result;
END;
$$;

-- Expor via RPC público
DROP FUNCTION IF EXISTS public.exec_sql(text);
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$ SELECT utils.exec_sql($1); $$;

-- Configurar permissões
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM public;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO anon, authenticated, service_role;

-- Verificar se foi criada corretamente
SELECT 'Função public.exec_sql criada com sucesso!' as status;