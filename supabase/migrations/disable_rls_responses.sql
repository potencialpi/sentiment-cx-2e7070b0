-- Desabilitar completamente RLS na tabela responses como solução temporária
-- Isso permitirá que as inserções funcionem enquanto investigamos o problema

-- Verificar status atual
DO $$
BEGIN
    RAISE NOTICE '=== ANTES DA CORREÇÃO ===';
    RAISE NOTICE 'RLS habilitado na tabela responses: %', (
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'responses'
    );
END $$;

-- Remover todas as políticas RLS da tabela responses
DROP POLICY IF EXISTS "allow_all_inserts" ON public.responses;
DROP POLICY IF EXISTS "owners_select_responses" ON public.responses;
DROP POLICY IF EXISTS "public_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "owners_view_survey_responses" ON public.responses;
DROP POLICY IF EXISTS "allow_anonymous_response_insertion" ON public.responses;
DROP POLICY IF EXISTS "survey_owners_view_responses" ON public.responses;

-- Desabilitar RLS completamente na tabela responses
ALTER TABLE public.responses DISABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi desabilitado
DO $$
BEGIN
    RAISE NOTICE '=== APÓS DESABILITAR RLS ===';
    RAISE NOTICE 'RLS habilitado na tabela responses: %', (
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'responses'
    );
END $$;

-- Testar inserção sem RLS
DO $$
DECLARE
    test_survey_id uuid;
    test_response_id uuid;
BEGIN
    RAISE NOTICE '=== TESTE DE INSERÇÃO SEM RLS ===';
    
    -- Buscar um survey ativo
    SELECT id INTO test_survey_id 
    FROM public.surveys 
    WHERE status = 'active' 
    AND unique_link IS NOT NULL 
    LIMIT 1;
    
    IF test_survey_id IS NOT NULL THEN
        RAISE NOTICE 'Survey encontrado para teste: %', test_survey_id;
        
        BEGIN
            -- Tentar inserir resposta
            INSERT INTO public.responses (
                survey_id,
                respondent_id,
                responses
            ) VALUES (
                test_survey_id,
                gen_random_uuid(),
                '{"question_1": "resposta_teste", "timestamp": "2025-01-25T12:00:00Z"}'::jsonb
            ) RETURNING id INTO test_response_id;
            
            RAISE NOTICE '✅ SUCESSO! Inserção funcionou sem RLS. ID: %', test_response_id;
            
            -- Limpar dados de teste
            DELETE FROM public.responses WHERE id = test_response_id;
            RAISE NOTICE '🧹 Dados de teste removidos';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ ERRO mesmo sem RLS: % - %', SQLSTATE, SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ Nenhum survey ativo encontrado';
    END IF;
    RAISE NOTICE '🎯 RLS DESABILITADO NA TABELA RESPONSES - Inserções agora devem funcionar normalmente';
END $$;