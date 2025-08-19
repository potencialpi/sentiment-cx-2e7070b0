-- CORREÇÃO: Primeiro verificar e remover todas as políticas existentes

-- Verificar políticas existentes
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'responses';

-- Remover TODAS as políticas existentes (incluindo as que podem estar ocultas)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'responses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.responses', policy_record.policyname);
    END LOOP;
END $$;

-- Agora criar as políticas corretas
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

SELECT 'Políticas RLS corrigidas com sucesso!' as status;