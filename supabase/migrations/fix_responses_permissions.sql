-- Corrigir permissões da tabela responses para permitir inserções anônimas
-- O problema pode ser que as roles anon/authenticated não têm permissão INSERT na tabela

-- Verificar permissões atuais
DO $$
DECLARE
    grant_record RECORD;
BEGIN
    RAISE NOTICE '=== VERIFICANDO PERMISSÕES ATUAIS DA TABELA RESPONSES ===';
    
    FOR grant_record IN 
        SELECT grantee, privilege_type
        FROM information_schema.role_table_grants 
        WHERE table_schema = 'public' 
        AND table_name = 'responses'
        AND grantee IN ('anon', 'authenticated', 'public')
        ORDER BY grantee, privilege_type
    LOOP
        RAISE NOTICE 'Role: % | Permissão: %', grant_record.grantee, grant_record.privilege_type;
    END LOOP;
    
    RAISE NOTICE '=== CONCEDENDO PERMISSÕES NECESSÁRIAS ===';
END $$;

-- Conceder permissões básicas para as roles
GRANT SELECT ON public.responses TO anon;
GRANT INSERT ON public.responses TO anon;
GRANT ALL PRIVILEGES ON public.responses TO authenticated;

-- Verificar se as permissões foram aplicadas
DO $$
DECLARE
    grant_record RECORD;
BEGIN
    RAISE NOTICE '=== PERMISSÕES APÓS CORREÇÃO ===';
    
    FOR grant_record IN 
        SELECT grantee, privilege_type
        FROM information_schema.role_table_grants 
        WHERE table_schema = 'public' 
        AND table_name = 'responses'
        AND grantee IN ('anon', 'authenticated', 'public')
        ORDER BY grantee, privilege_type
    LOOP
        RAISE NOTICE 'Role: % | Permissão: %', grant_record.grantee, grant_record.privilege_type;
    END LOOP;
END $$;

-- Testar inserção como anônimo
DO $$
DECLARE
    test_survey_id uuid;
    test_response_id uuid;
BEGIN
    RAISE NOTICE '=== TESTANDO INSERÇÃO ANÔNIMA ===';
    
    -- Buscar um survey ativo para teste
    SELECT id INTO test_survey_id 
    FROM public.surveys 
    WHERE status = 'active' 
    AND unique_link IS NOT NULL 
    LIMIT 1;
    
    IF test_survey_id IS NOT NULL THEN
        RAISE NOTICE 'Survey de teste encontrado: %', test_survey_id;
        
        -- Tentar inserir uma resposta de teste
        BEGIN
            INSERT INTO public.responses (
                survey_id,
                respondent_id,
                responses
            ) VALUES (
                test_survey_id,
                gen_random_uuid(),
                '{"test_question": "test_answer", "timestamp": "2025-01-25T12:00:00Z"}'::jsonb
            ) RETURNING id INTO test_response_id;
            
            RAISE NOTICE '✅ Inserção bem-sucedida! ID da resposta: %', test_response_id;
            
            -- Limpar dados de teste
            DELETE FROM public.responses WHERE id = test_response_id;
            RAISE NOTICE '🧹 Dados de teste removidos';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro na inserção: % - %', SQLSTATE, SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ Nenhum survey ativo encontrado para teste';
    END IF;
END $$;