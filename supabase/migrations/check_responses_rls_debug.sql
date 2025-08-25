-- Debug: Verificar políticas RLS da tabela responses
-- Esta migração é apenas para debug - não faz alterações

-- 1. Verificar políticas RLS atuais
DO $$
DECLARE
    policy_record RECORD;
    table_record RECORD;
    grant_record RECORD;
BEGIN
    RAISE NOTICE '=== VERIFICANDO POLÍTICAS RLS DA TABELA RESPONSES ===';
    
    -- Verificar se RLS está habilitado
    SELECT schemaname, tablename, rowsecurity 
    INTO table_record
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'responses';
    
    IF FOUND THEN
        RAISE NOTICE 'RLS habilitado para responses: %', table_record.rowsecurity;
    ELSE
        RAISE NOTICE 'Tabela responses não encontrada!';
    END IF;
    
    -- Listar todas as políticas
    RAISE NOTICE '--- POLÍTICAS ATUAIS ---';
    FOR policy_record IN 
        SELECT policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'responses'
    LOOP
        RAISE NOTICE 'Política: % | Comando: % | Roles: % | Permissiva: %', 
            policy_record.policyname, 
            policy_record.cmd, 
            policy_record.roles, 
            policy_record.permissive;
        RAISE NOTICE '  Condição (qual): %', policy_record.qual;
        RAISE NOTICE '  Verificação (with_check): %', policy_record.with_check;
        RAISE NOTICE '---';
    END LOOP;
    
    -- Verificar permissões da tabela
    RAISE NOTICE '--- PERMISSÕES DA TABELA ---';
    FOR grant_record IN 
        SELECT grantee, privilege_type
        FROM information_schema.role_table_grants 
        WHERE table_schema = 'public' 
        AND table_name = 'responses'
        AND grantee IN ('anon', 'authenticated')
        ORDER BY grantee, privilege_type
    LOOP
        RAISE NOTICE 'Role: % | Permissão: %', grant_record.grantee, grant_record.privilege_type;
    END LOOP;
    
    RAISE NOTICE '=== FIM DA VERIFICAÇÃO ===';
END $$;