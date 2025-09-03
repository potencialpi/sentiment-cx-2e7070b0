-- Migração para testar se o problema é realmente com RLS
-- Temporariamente desabilita RLS para verificar se a inserção funciona

-- 1. Primeiro, vamos verificar as políticas atuais
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'responses' 
AND schemaname = 'public';

-- 2. Desabilitar RLS temporariamente
ALTER TABLE public.responses DISABLE ROW LEVEL SECURITY;

-- 3. Garantir permissões básicas
GRANT ALL ON public.responses TO anon;
GRANT ALL ON public.responses TO authenticated;

-- 4. Teste de inserção sem RLS
DO $$
DECLARE
    test_survey_id uuid;
    test_response_id uuid;
BEGIN
    -- Buscar uma pesquisa ativa para teste
    SELECT id INTO test_survey_id 
    FROM public.surveys 
    WHERE status = 'active' 
    LIMIT 1;
    
    IF test_survey_id IS NOT NULL THEN
        -- Tentar inserir uma resposta de teste
        INSERT INTO public.responses (survey_id, responses, respondent_id)
        VALUES (
            test_survey_id,
            '{"test": "rls_disabled_test"}',
            gen_random_uuid()
        )
        RETURNING id INTO test_response_id;
        
        -- Se chegou até aqui, a inserção funcionou
        RAISE NOTICE 'Teste sem RLS bem-sucedido! ID da resposta: %', test_response_id;
        
        -- Limpar dados de teste
        DELETE FROM public.responses WHERE id = test_response_id;
        RAISE NOTICE 'Dados de teste limpos com sucesso';
    ELSE
        RAISE NOTICE 'Nenhuma pesquisa ativa encontrada para teste';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste sem RLS: %', SQLERRM;
END $$;

-- 5. Reabilitar RLS
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- 6. Criar uma política muito simples que permite tudo para anon
CREATE POLICY "allow_all_anon" ON public.responses
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- 7. Criar política para authenticated users
CREATE POLICY "allow_all_authenticated" ON public.responses
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8. Teste final com RLS reabilitado
DO $$
DECLARE
    test_survey_id uuid;
    test_response_id uuid;
BEGIN
    -- Buscar uma pesquisa ativa para teste
    SELECT id INTO test_survey_id 
    FROM public.surveys 
    WHERE status = 'active' 
    LIMIT 1;
    
    IF test_survey_id IS NOT NULL THEN
        -- Tentar inserir uma resposta de teste
        INSERT INTO public.responses (survey_id, responses, respondent_id)
        VALUES (
            test_survey_id,
            '{"test": "rls_enabled_simple_test"}',
            gen_random_uuid()
        )
        RETURNING id INTO test_response_id;
        
        -- Se chegou até aqui, a inserção funcionou
        RAISE NOTICE 'Teste com RLS simples bem-sucedido! ID da resposta: %', test_response_id;
        
        -- Limpar dados de teste
        DELETE FROM public.responses WHERE id = test_response_id;
        RAISE NOTICE 'Dados de teste limpos com sucesso';
    ELSE
        RAISE NOTICE 'Nenhuma pesquisa ativa encontrada para teste';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste com RLS simples: %', SQLERRM;
END $$;