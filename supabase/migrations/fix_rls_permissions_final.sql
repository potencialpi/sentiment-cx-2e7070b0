-- Corrigir políticas RLS para permitir acesso adequado aos dados
-- Este script resolve os problemas de PERMISSION_DENIED

-- 1. Remover políticas conflitantes existentes
DROP POLICY IF EXISTS "Users can view responses from own surveys" ON responses;
DROP POLICY IF EXISTS "Users can view own survey responses" ON responses;
DROP POLICY IF EXISTS "Owners can view responses" ON responses;
DROP POLICY IF EXISTS "Survey owners can view responses" ON responses;

-- 2. Criar política clara para responses - proprietários podem ver respostas de suas pesquisas
CREATE POLICY "Survey owners can access responses" ON responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- 3. Garantir que proprietários podem inserir/atualizar responses (para testes)
CREATE POLICY "Survey owners can manage responses" ON responses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- 4. Corrigir políticas para question_responses
DROP POLICY IF EXISTS "Users can view question responses from own surveys" ON question_responses;
DROP POLICY IF EXISTS "Survey owners can view question responses" ON question_responses;

CREATE POLICY "Survey owners can access question responses" ON question_responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM responses r
            JOIN surveys s ON s.id = r.survey_id
            WHERE r.id = question_responses.response_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Survey owners can manage question responses" ON question_responses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM responses r
            JOIN surveys s ON s.id = r.survey_id
            WHERE r.id = question_responses.response_id
            AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM responses r
            JOIN surveys s ON s.id = r.survey_id
            WHERE r.id = question_responses.response_id
            AND s.user_id = auth.uid()
        )
    );

-- 5. Garantir que as políticas para questions estão corretas
DROP POLICY IF EXISTS "Users can view questions from own surveys" ON questions;
DROP POLICY IF EXISTS "Survey owners can view questions" ON questions;

CREATE POLICY "Survey owners can access questions" ON questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

CREATE POLICY "Survey owners can manage questions" ON questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- 6. Garantir permissões básicas para o role authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON question_responses TO authenticated;

-- 7. Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd 
FROM pg_policies 
WHERE tablename IN ('responses', 'questions', 'question_responses') 
ORDER BY tablename, policyname;