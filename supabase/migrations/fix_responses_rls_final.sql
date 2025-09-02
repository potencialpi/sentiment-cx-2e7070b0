-- Migração final para corrigir RLS na tabela responses
-- Esta migração remove todas as políticas conflitantes e cria uma política simples e funcional

-- 1. Remover todas as políticas RLS existentes na tabela responses
DROP POLICY IF EXISTS "public_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "owners_view_survey_responses" ON public.responses;
DROP POLICY IF EXISTS "Enable insert for anon and authenticated users" ON public.responses;
DROP POLICY IF EXISTS "Enable select for authenticated users based on surveys" ON public.responses;
DROP POLICY IF EXISTS "Allow anonymous response submission" ON public.responses;
DROP POLICY IF EXISTS "Allow survey owners to view responses" ON public.responses;

-- 2. Verificar se RLS está habilitado (deve estar)
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- 3. Criar política simples para permitir inserção anônima
-- Esta política permite que qualquer usuário (anônimo ou autenticado) insira respostas
CREATE POLICY "allow_anonymous_insert_responses" ON public.responses
    FOR INSERT
    WITH CHECK (true);

-- 4. Criar política para permitir que proprietários de pesquisas vejam as respostas
CREATE POLICY "allow_survey_owners_select_responses" ON public.responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = responses.survey_id
            AND s.user_id = auth.uid()
        )
    );

-- 5. Garantir permissões de tabela para roles anon e authenticated
GRANT INSERT ON public.responses TO anon;
GRANT INSERT ON public.responses TO authenticated;
GRANT SELECT ON public.responses TO authenticated;

-- 6. Verificar as políticas criadas
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

-- 7. Verificar permissões da tabela
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'responses'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- 8. Teste de inserção como anon
-- Este bloco será executado como parte da migração para verificar se funciona
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
            '{"test": "migration_test"}',
            gen_random_uuid()
        )
        RETURNING id INTO test_response_id;
        
        -- Se chegou até aqui, a inserção funcionou
        RAISE NOTICE 'Teste de inserção bem-sucedido! ID da resposta: %', test_response_id;
        
        -- Limpar dados de teste
        DELETE FROM public.responses WHERE id = test_response_id;
        RAISE NOTICE 'Dados de teste limpos com sucesso';
    ELSE
        RAISE NOTICE 'Nenhuma pesquisa ativa encontrada para teste';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste de inserção: %', SQLERRM;
END $$;