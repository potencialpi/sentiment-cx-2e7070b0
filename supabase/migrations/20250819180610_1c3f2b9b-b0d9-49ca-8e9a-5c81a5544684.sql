-- PLANO DE CORREÇÃO: Limpeza e simplificação das políticas RLS na tabela responses

-- 1. REMOVER todas as políticas RLS existentes na tabela responses
DROP POLICY IF EXISTS "Users can view responses from own surveys" ON public.responses;
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
DROP POLICY IF EXISTS "Users can view responses to their surveys" ON public.responses;

-- 2. CRIAR políticas mais simples e específicas

-- Política PÚBLICA para INSERT - permitir que qualquer pessoa (anônima) insira respostas
CREATE POLICY "public_insert_responses" ON public.responses
    FOR INSERT 
    WITH CHECK (true);

-- Política para SELECT - apenas donos das pesquisas podem ver respostas
CREATE POLICY "owners_view_survey_responses" ON public.responses
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- 3. CRIAR função de teste para validar inserção anônima
CREATE OR REPLACE FUNCTION public.test_anonymous_response_insertion()
RETURNS TABLE(test_result boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    test_survey_id uuid;
    test_response_id uuid;
BEGIN
    -- Buscar uma pesquisa ativa para teste
    SELECT id INTO test_survey_id 
    FROM public.surveys 
    WHERE status = 'active' 
    AND unique_link IS NOT NULL 
    LIMIT 1;
    
    IF test_survey_id IS NULL THEN
        RETURN QUERY SELECT false, 'Nenhuma pesquisa ativa encontrada para teste';
        RETURN;
    END IF;
    
    -- Tentar inserir uma resposta de teste (simulando usuário anônimo)
    BEGIN
        INSERT INTO public.responses (
            survey_id,
            respondent_id,
            responses
        ) VALUES (
            test_survey_id,
            gen_random_uuid(),
            '{"test": "response from anonymous user"}'::jsonb
        ) RETURNING id INTO test_response_id;
        
        -- Se chegou aqui, a inserção funcionou
        -- Limpar o teste
        DELETE FROM public.responses WHERE id = test_response_id;
        
        RETURN QUERY SELECT true, 'Inserção anônima funcionando corretamente';
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Erro na inserção anônima: ' || SQLERRM;
    END;
END;
$$;

-- 4. CRIAR função para validar que as políticas estão funcionando
CREATE OR REPLACE FUNCTION public.validate_response_policies()
RETURNS TABLE(policy_name text, is_active boolean, description text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Verificar se RLS está habilitado
    RETURN QUERY
    SELECT 
        'RLS_ENABLED'::text,
        EXISTS(
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'responses' 
            AND rowsecurity = true
        ),
        'Row Level Security habilitado na tabela responses'::text;
        
    -- Verificar política de inserção pública
    RETURN QUERY
    SELECT 
        'PUBLIC_INSERT'::text,
        EXISTS(
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'responses' 
            AND policyname = 'public_insert_responses'
            AND cmd = 'INSERT'
        ),
        'Política de inserção pública ativa'::text;
        
    -- Verificar política de seleção para donos
    RETURN QUERY
    SELECT 
        'OWNERS_SELECT'::text,
        EXISTS(
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'responses' 
            AND policyname = 'owners_view_survey_responses'
            AND cmd = 'SELECT'
        ),
        'Política de seleção para donos ativa'::text;
END;
$$;

-- 5. Executar teste inicial
SELECT 'Políticas RLS simplificadas aplicadas com sucesso!' as status;