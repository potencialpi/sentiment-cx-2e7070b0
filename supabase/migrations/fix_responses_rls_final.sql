-- Correção definitiva das políticas RLS para a tabela responses
-- O problema é que mesmo com WITH CHECK (true), ainda há violação de RLS

-- Primeiro, vamos verificar o status atual
DO $$
BEGIN
    RAISE NOTICE '=== STATUS ATUAL DA TABELA RESPONSES ===';
    RAISE NOTICE 'RLS habilitado: %', (
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'responses'
    );
END $$;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "public_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "owners_view_survey_responses" ON public.responses;
DROP POLICY IF EXISTS "allow_anonymous_response_insertion" ON public.responses;
DROP POLICY IF EXISTS "survey_owners_view_responses" ON public.responses;

-- Desabilitar RLS temporariamente para teste
ALTER TABLE public.responses DISABLE ROW LEVEL SECURITY;

-- Testar inserção sem RLS
DO $$
DECLARE
    test_survey_id uuid;
    test_response_id uuid;
BEGIN
    RAISE NOTICE '=== TESTE SEM RLS ===';
    
    SELECT id INTO test_survey_id 
    FROM public.surveys 
    WHERE status = 'active' 
    AND unique_link IS NOT NULL 
    LIMIT 1;
    
    IF test_survey_id IS NOT NULL THEN
        INSERT INTO public.responses (
            survey_id,
            respondent_id,
            responses
        ) VALUES (
            test_survey_id,
            gen_random_uuid(),
            '{"test": "without_rls"}'::jsonb
        ) RETURNING id INTO test_response_id;
        
        RAISE NOTICE '✅ Inserção sem RLS funcionou! ID: %', test_response_id;
        
        -- Limpar
        DELETE FROM public.responses WHERE id = test_response_id;
    END IF;
END $$;

-- Reabilitar RLS
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Criar política mais permissiva para INSERT
CREATE POLICY "allow_all_inserts" 
ON public.responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Criar política para SELECT (apenas proprietários)
CREATE POLICY "owners_select_responses" 
ON public.responses 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.surveys 
        WHERE surveys.id = responses.survey_id 
        AND surveys.user_id = auth.uid()
    )
);

-- Testar inserção com nova política
DO $$
DECLARE
    test_survey_id uuid;
    test_response_id uuid;
BEGIN
    RAISE NOTICE '=== TESTE COM NOVA POLÍTICA RLS ===';
    
    SELECT id INTO test_survey_id 
    FROM public.surveys 
    WHERE status = 'active' 
    AND unique_link IS NOT NULL 
    LIMIT 1;
    
    IF test_survey_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.responses (
                survey_id,
                respondent_id,
                responses
            ) VALUES (
                test_survey_id,
                gen_random_uuid(),
                '{"test": "with_new_rls"}'::jsonb
            ) RETURNING id INTO test_response_id;
            
            RAISE NOTICE '✅ Inserção com nova política funcionou! ID: %', test_response_id;
            
            -- Limpar
            DELETE FROM public.responses WHERE id = test_response_id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro com nova política: % - %', SQLSTATE, SQLERRM;
        END;
    END IF;
END $$;

-- Verificar políticas finais
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== POLÍTICAS FINAIS ===';
    
    FOR policy_record IN 
        SELECT policyname, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'responses'
    LOOP
        RAISE NOTICE 'Política: % | Comando: % | Roles: %', 
            policy_record.policyname, 
            policy_record.cmd, 
            policy_record.roles;
    END LOOP;
END $$;