-- Função para verificar status do RLS (Row Level Security)
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE(
    table_name text,
    rls_enabled boolean,
    policies_count integer,
    anon_access boolean,
    authenticated_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        t.rowsecurity,
        COALESCE(p.policy_count, 0)::integer,
        COALESCE(anon_grants.has_access, false),
        COALESCE(auth_grants.has_access, false)
    FROM pg_tables t
    LEFT JOIN (
        SELECT 
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY tablename
    ) p ON p.tablename = t.tablename
    LEFT JOIN (
        SELECT 
            table_name,
            true as has_access
        FROM information_schema.role_table_grants 
        WHERE table_schema = 'public' 
        AND grantee = 'anon'
        AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        GROUP BY table_name
    ) anon_grants ON anon_grants.table_name = t.tablename
    LEFT JOIN (
        SELECT 
            table_name,
            true as has_access
        FROM information_schema.role_table_grants 
        WHERE table_schema = 'public' 
        AND grantee = 'authenticated'
        AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        GROUP BY table_name
    ) auth_grants ON auth_grants.table_name = t.tablename
    WHERE t.schemaname = 'public' 
    AND t.tablename IN ('surveys', 'responses', 'profiles')
    ORDER BY t.tablename;
END;
$$;

-- Função para obter configurações de segurança do sistema
CREATE OR REPLACE FUNCTION public.get_security_config()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result json;
    rls_status json;
    policies_info json;
BEGIN
    -- Obter status do RLS
    SELECT json_agg(
        json_build_object(
            'table_name', table_name,
            'rls_enabled', rls_enabled,
            'policies_count', policies_count,
            'anon_access', anon_access,
            'authenticated_access', authenticated_access
        )
    ) INTO rls_status
    FROM public.check_rls_status();
    
    -- Obter informações das políticas
    SELECT json_agg(
        json_build_object(
            'table_name', tablename,
            'policy_name', policyname,
            'command', cmd,
            'roles', roles,
            'permissive', permissive
        )
    ) INTO policies_info
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('surveys', 'responses', 'profiles');
    
    -- Construir resultado final
    result := json_build_object(
        'rls_status', COALESCE(rls_status, '[]'::json),
        'policies', COALESCE(policies_info, '[]'::json),
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION public.check_rls_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_config() TO authenticated;

SELECT 'Funções de verificação de RLS criadas com sucesso!' as status;