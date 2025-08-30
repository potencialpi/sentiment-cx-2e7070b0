-- Remover todas as políticas RLS existentes da tabela responses
DROP POLICY IF EXISTS "Allow anonymous insert responses" ON public.responses;
DROP POLICY IF EXISTS "responses_delete_own" ON public.responses;
DROP POLICY IF EXISTS "responses_insert_public" ON public.responses;
DROP POLICY IF EXISTS "responses_owner_delete" ON public.responses;
DROP POLICY IF EXISTS "responses_owner_select" ON public.responses;
DROP POLICY IF EXISTS "responses_owner_update" ON public.responses;
DROP POLICY IF EXISTS "responses_public_insert" ON public.responses;
DROP POLICY IF EXISTS "responses_select_own" ON public.responses;
DROP POLICY IF EXISTS "responses_update_own" ON public.responses;

-- Recriar apenas as 4 políticas essenciais

-- 1. Política de inserção pública para usuários anônimos responderem surveys
CREATE POLICY "responses_public_insert" ON public.responses
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE id = survey_id 
            AND status = 'active' 
            AND unique_link IS NOT NULL
        )
    );

-- 2. Política de seleção para proprietários de surveys
CREATE POLICY "responses_owner_select" ON public.responses
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE id = responses.survey_id 
            AND user_id = auth.uid()
        )
    );

-- 3. Política de atualização para proprietários de surveys
CREATE POLICY "responses_owner_update" ON public.responses
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE id = responses.survey_id 
            AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE id = responses.survey_id 
            AND user_id = auth.uid()
        )
    );

-- 4. Política de exclusão para proprietários de surveys
CREATE POLICY "responses_owner_delete" ON public.responses
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE id = responses.survey_id 
            AND user_id = auth.uid()
        )
    );