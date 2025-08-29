-- Criar função para listar migrações remotas
CREATE OR REPLACE FUNCTION public.get_remote_migrations()
RETURNS TABLE(version text, name text) AS $$
BEGIN
  RETURN QUERY
  SELECT sm.version, sm.name
  FROM supabase_migrations.schema_migrations sm
  ORDER BY sm.version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar a função
SELECT * FROM public.get_remote_migrations();