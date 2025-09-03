-- Verificar e corrigir permissões da tabela responses
-- Garantir que as roles anon e authenticated tenham permissões INSERT

-- Conceder permissões INSERT para role anon
GRANT INSERT ON public.responses TO anon;

-- Conceder permissões INSERT para role authenticated  
GRANT INSERT ON public.responses TO authenticated;

-- Conceder permissões SELECT para role authenticated (para ver suas próprias respostas)
GRANT SELECT ON public.responses TO authenticated;

-- Verificar permissões atuais
DO $$
DECLARE
    grant_record RECORD;
BEGIN
    RAISE NOTICE '=== PERMISSÕES ATUAIS DA TABELA RESPONSES ===';
    
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
END $$;

-- Testar inserção como role anon (simulação)
DO $$
DECLARE
    test_survey_id uuid;
    test_response_id uuid;
BEGIN
    -- Buscar um survey ativo para teste
    SELECT id INTO test_survey_id 
    FROM public.surveys 
    WHERE status = 'active' 
      AND unique_link IS NOT NULL 
      AND current_responses < max_responses
    LIMIT 1;
    
    IF test_survey_id IS NOT NULL THEN
        RAISE NOTICE '✅ Survey ativo encontrado para teste: %', test_survey_id;
        
        -- Tentar inserir uma resposta de teste
        BEGIN
            INSERT INTO public.responses (survey_id, respondent_id, responses)
            VALUES (
                test_survey_id,
                gen_random_uuid(),
                '{"test": "response"}'
            ) RETURNING id INTO test_response_id;
            
            RAISE NOTICE '✅ Inserção de teste bem-sucedida! ID: %', test_response_id;
            
            -- Limpar dados de teste
            DELETE FROM public.responses WHERE id = test_response_id;
            RAISE NOTICE '✅ Dados de teste limpos';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro na inserção de teste: % - %', SQLSTATE, SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ Nenhum survey ativo encontrado para teste';
    END IF;
END $$;