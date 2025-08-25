-- Verificar e habilitar RLS em todas as tabelas que não têm RLS ativo
DO $$
DECLARE
    table_name text;
    table_info record;
BEGIN
    -- Buscar todas as tabelas sem RLS habilitado no schema public
    FOR table_info IN (
        SELECT t.tablename
        FROM pg_tables t
        LEFT JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public'
        AND NOT c.relrowsecurity
        AND t.tablename NOT LIKE 'pg_%'
        AND t.tablename NOT LIKE 'information_schema%'
    ) LOOP
        -- Habilitar RLS para cada tabela encontrada
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_info.tablename);
        RAISE NOTICE 'RLS habilitado para tabela: %', table_info.tablename;
    END LOOP;
END $$;