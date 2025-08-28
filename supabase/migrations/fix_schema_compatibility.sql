-- Migração para corrigir compatibilidade do schema e RLS
-- Data: 2025-01-28
-- Objetivo: Garantir que todas as tabelas tenham RLS adequado e políticas corretas

-- 1. Forçar RLS em todas as tabelas que precisam
ALTER TABLE questions FORCE ROW LEVEL SECURITY;
ALTER TABLE question_responses FORCE ROW LEVEL SECURITY;
ALTER TABLE respondents FORCE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE subscribers FORCE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE sentiment_analysis FORCE ROW LEVEL SECURITY;

-- 2. Criar políticas RLS para question_responses
DROP POLICY IF EXISTS "question_responses_select_own" ON question_responses;
DROP POLICY IF EXISTS "question_responses_insert_own" ON question_responses;
DROP POLICY IF EXISTS "question_responses_update_own" ON question_responses;
DROP POLICY IF EXISTS "question_responses_delete_own" ON question_responses;

CREATE POLICY "question_responses_select_own" ON question_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM responses r 
            JOIN surveys s ON r.survey_id = s.id 
            WHERE r.id = question_responses.response_id 
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "question_responses_insert_own" ON question_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM responses r 
            JOIN surveys s ON r.survey_id = s.id 
            WHERE r.id = question_responses.response_id 
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "question_responses_update_own" ON question_responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM responses r 
            JOIN surveys s ON r.survey_id = s.id 
            WHERE r.id = question_responses.response_id 
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "question_responses_delete_own" ON question_responses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM responses r 
            JOIN surveys s ON r.survey_id = s.id 
            WHERE r.id = question_responses.response_id 
            AND s.user_id = auth.uid()
        )
    );

-- 3. Criar políticas RLS para respondents
DROP POLICY IF EXISTS "respondents_select_own" ON respondents;
DROP POLICY IF EXISTS "respondents_insert_own" ON respondents;
DROP POLICY IF EXISTS "respondents_update_own" ON respondents;
DROP POLICY IF EXISTS "respondents_delete_own" ON respondents;

CREATE POLICY "respondents_select_own" ON respondents
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "respondents_insert_own" ON respondents
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "respondents_update_own" ON respondents
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "respondents_delete_own" ON respondents
    FOR DELETE USING (user_id = auth.uid());

-- 4. Criar políticas RLS para companies
DROP POLICY IF EXISTS "companies_select_own" ON companies;
DROP POLICY IF EXISTS "companies_insert_own" ON companies;
DROP POLICY IF EXISTS "companies_update_own" ON companies;
DROP POLICY IF EXISTS "companies_delete_own" ON companies;

CREATE POLICY "companies_select_own" ON companies
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "companies_insert_own" ON companies
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies_update_own" ON companies
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "companies_delete_own" ON companies
    FOR DELETE USING (user_id = auth.uid());

-- 5. Criar políticas RLS para transactions
DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON transactions;

CREATE POLICY "transactions_select_own" ON transactions
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "transactions_insert_own" ON transactions
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "transactions_update_own" ON transactions
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- 6. Criar políticas RLS para subscribers
DROP POLICY IF EXISTS "subscribers_select_own" ON subscribers;
DROP POLICY IF EXISTS "subscribers_insert_own" ON subscribers;
DROP POLICY IF EXISTS "subscribers_update_own" ON subscribers;

CREATE POLICY "subscribers_select_own" ON subscribers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "subscribers_insert_own" ON subscribers
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "subscribers_update_own" ON subscribers
    FOR UPDATE USING (user_id = auth.uid());

-- 7. Políticas especiais para checkout_sessions (apenas service role)
DROP POLICY IF EXISTS "checkout_sessions_service_only" ON checkout_sessions;

CREATE POLICY "checkout_sessions_service_only" ON checkout_sessions
    FOR ALL USING (false); -- Bloqueia acesso para usuários normais

-- 8. Criar políticas RLS para audit_log (apenas leitura para usuários)
DROP POLICY IF EXISTS "audit_log_select_own" ON audit_log;

CREATE POLICY "audit_log_select_own" ON audit_log
    FOR SELECT USING (user_id = auth.uid());

-- 9. Criar políticas RLS para sentiment_analysis
DROP POLICY IF EXISTS "sentiment_analysis_select_own" ON sentiment_analysis;
DROP POLICY IF EXISTS "sentiment_analysis_insert_own" ON sentiment_analysis;
DROP POLICY IF EXISTS "sentiment_analysis_update_own" ON sentiment_analysis;
DROP POLICY IF EXISTS "sentiment_analysis_delete_own" ON sentiment_analysis;

CREATE POLICY "sentiment_analysis_select_own" ON sentiment_analysis
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "sentiment_analysis_insert_own" ON sentiment_analysis
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "sentiment_analysis_update_own" ON sentiment_analysis
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "sentiment_analysis_delete_own" ON sentiment_analysis
    FOR DELETE USING (user_id = auth.uid());

-- 10. Garantir permissões adequadas para roles
-- Revogar permissões excessivas
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Conceder permissões mínimas necessárias
GRANT SELECT ON profiles TO authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON surveys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON question_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON respondents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscribers TO authenticated;
GRANT SELECT ON audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sentiment_analysis TO authenticated;

-- Permissões para anon (apenas para respostas públicas)
GRANT SELECT ON surveys TO anon;
GRANT SELECT ON questions TO anon;
GRANT INSERT ON responses TO anon;
GRANT INSERT ON question_responses TO anon;

-- 11. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_question_responses_response_id ON question_responses(response_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_question_id ON question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_survey_id ON sentiment_analysis(survey_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_user_id ON sentiment_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- 12. Adicionar comentários para documentação
COMMENT ON TABLE question_responses IS 'Respostas individuais às perguntas - RLS baseado no dono da pesquisa';
COMMENT ON TABLE respondents IS 'Respondentes das pesquisas - RLS baseado no usuário';
COMMENT ON TABLE companies IS 'Empresas dos usuários - RLS baseado no usuário';
COMMENT ON TABLE transactions IS 'Transações financeiras - RLS baseado no profile do usuário';
COMMENT ON TABLE subscribers IS 'Assinantes - RLS baseado no usuário';
COMMENT ON TABLE audit_log IS 'Log de auditoria - RLS baseado no usuário';

-- 13. Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;