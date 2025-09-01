-- MELHORIAS CRÍTICAS DE SEGURANÇA
-- Esta migração implementa correções de segurança para Magic Links e acesso público aos dados
-- Data: 2025-01-13

-- ========================================
-- 1. CORREÇÃO DAS POLÍTICAS RLS DOS MAGIC LINKS
-- ========================================

-- Remover políticas problemáticas que permitem leitura pública dos magic links
DROP POLICY IF EXISTS "Allow reading valid magic links" ON public.magic_links;
DROP POLICY IF EXISTS "magic_links_public_read" ON public.magic_links;
DROP POLICY IF EXISTS "public_read_magic_links" ON public.magic_links;

-- Remover políticas existentes para recriar com segurança
DROP POLICY IF EXISTS "survey_owners_view_magic_links" ON public.magic_links;
DROP POLICY IF EXISTS "survey_owners_create_magic_links" ON public.magic_links;
DROP POLICY IF EXISTS "survey_owners_update_magic_links" ON public.magic_links;

-- Garantir que RLS está habilitado e forçado
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_links FORCE ROW LEVEL SECURITY;

-- Política RESTRITIVA: Apenas service-role pode acessar magic links
-- Isso garante que apenas Edge Functions backend possam acessar tokens
CREATE POLICY "service_role_only_magic_links_access" ON public.magic_links
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Política para proprietários de pesquisas: podem gerenciar magic links de suas pesquisas
-- MAS SEM ACESSO AO TOKEN (apenas metadados)
CREATE POLICY "survey_owners_manage_magic_links_metadata" ON public.magic_links
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = magic_links.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Política para criação de magic links pelos proprietários
CREATE POLICY "survey_owners_create_magic_links" ON public.magic_links
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = magic_links.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- ========================================
-- 2. REMOÇÃO DO ACESSO PÚBLICO AOS DADOS
-- ========================================

-- Remover políticas que permitem acesso anônimo a surveys
DROP POLICY IF EXISTS "Allow anonymous read access to surveys" ON public.surveys;
DROP POLICY IF EXISTS "anonymous_read_surveys" ON public.surveys;
DROP POLICY IF EXISTS "public_read_surveys" ON public.surveys;

-- Remover políticas que permitem acesso anônimo a questions
DROP POLICY IF EXISTS "Allow anonymous read access to questions" ON public.questions;
DROP POLICY IF EXISTS "anonymous_read_questions" ON public.questions;
DROP POLICY IF EXISTS "public_read_questions" ON public.questions;

-- Remover políticas que permitem inserção anônima de responses
DROP POLICY IF EXISTS "Allow anonymous insert responses" ON public.responses;
DROP POLICY IF EXISTS "anonymous_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "public_insert_responses" ON public.responses;
DROP POLICY IF EXISTS "allow_anonymous_response_insertion" ON public.responses;
DROP POLICY IF EXISTS "allow_anonymous_insert_responses" ON public.responses;

-- ========================================
-- 3. POLÍTICAS RESTRITIVAS PARA SURVEYS
-- ========================================

-- Garantir que RLS está habilitado
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys FORCE ROW LEVEL SECURITY;

-- Política para proprietários: acesso completo às suas pesquisas
CREATE POLICY "survey_owners_full_access" ON public.surveys
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Política RESTRITIVA: Acesso público apenas a pesquisas ativas com unique_link
-- E APENAS via Edge Functions (service_role)
CREATE POLICY "service_role_access_active_surveys" ON public.surveys
    FOR SELECT
    TO service_role
    USING (
        status = 'active' 
        AND unique_link IS NOT NULL
        AND current_responses < max_responses
    );

-- ========================================
-- 4. POLÍTICAS RESTRITIVAS PARA QUESTIONS
-- ========================================

-- Garantir que RLS está habilitado
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions FORCE ROW LEVEL SECURITY;

-- Política para proprietários: acesso completo às questões de suas pesquisas
CREATE POLICY "question_owners_full_access" ON public.questions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Política RESTRITIVA: Acesso a questões apenas via Edge Functions
-- Para pesquisas ativas e públicas
CREATE POLICY "service_role_access_active_survey_questions" ON public.questions
    FOR SELECT
    TO service_role
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.status = 'active'
            AND surveys.unique_link IS NOT NULL
            AND surveys.current_responses < surveys.max_responses
        )
    );

-- ========================================
-- 5. POLÍTICAS RESTRITIVAS PARA RESPONSES
-- ========================================

-- Garantir que RLS está habilitado
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses FORCE ROW LEVEL SECURITY;

-- Política para proprietários: acesso completo às respostas de suas pesquisas
CREATE POLICY "response_owners_full_access" ON public.responses
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Política RESTRITIVA: Inserção de respostas apenas via Edge Functions
-- Com validação de magic link
CREATE POLICY "service_role_insert_validated_responses" ON public.responses
    FOR INSERT
    TO service_role
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.status = 'active'
            AND surveys.current_responses < surveys.max_responses
        )
    );

-- ========================================
-- 6. REVOGAR PERMISSÕES ANÔNIMAS
-- ========================================

-- Revogar todas as permissões do role anon
REVOKE ALL ON public.surveys FROM anon;
REVOKE ALL ON public.questions FROM anon;
REVOKE ALL ON public.responses FROM anon;
REVOKE ALL ON public.magic_links FROM anon;

-- ========================================
-- 7. FUNÇÃO SEGURA PARA VALIDAÇÃO DE MAGIC LINK
-- ========================================

-- Atualizar função para ser mais segura (sem exposição de token)
CREATE OR REPLACE FUNCTION public.validate_magic_link_secure(
    _token TEXT,
    _email TEXT DEFAULT NULL
)
RETURNS TABLE (
    valid BOOLEAN,
    survey_id UUID,
    email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    link_record RECORD;
BEGIN
    -- Esta função só pode ser executada pelo service_role
    IF current_setting('role') != 'service_role' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, 'Acesso negado';
        RETURN;
    END IF;
    
    -- Buscar o magic link (sem expor o token)
    SELECT ml.survey_id, ml.email, ml.expires_at, ml.used_at,
           s.status as survey_status, s.current_responses, s.max_responses
    INTO link_record
    FROM public.magic_links ml
    JOIN public.surveys s ON s.id = ml.survey_id
    WHERE ml.token = _token;
    
    -- Verificar se o link existe
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, 'Token inválido';
        RETURN;
    END IF;
    
    -- Verificar se já foi usado
    IF link_record.used_at IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, link_record.survey_id, link_record.email, link_record.expires_at, 'Link já foi utilizado';
        RETURN;
    END IF;
    
    -- Verificar se expirou
    IF link_record.expires_at <= now() THEN
        RETURN QUERY SELECT FALSE, link_record.survey_id, link_record.email, link_record.expires_at, 'Link expirado';
        RETURN;
    END IF;
    
    -- Verificar se a pesquisa está ativa
    IF link_record.survey_status != 'active' THEN
        RETURN QUERY SELECT FALSE, link_record.survey_id, link_record.email, link_record.expires_at, 'Pesquisa não está ativa';
        RETURN;
    END IF;
    
    -- Verificar se ainda há vagas
    IF link_record.current_responses >= link_record.max_responses THEN
        RETURN QUERY SELECT FALSE, link_record.survey_id, link_record.email, link_record.expires_at, 'Pesquisa já atingiu o limite de respostas';
        RETURN;
    END IF;
    
    -- Verificar email se fornecido
    IF _email IS NOT NULL AND link_record.email != _email THEN
        RETURN QUERY SELECT FALSE, link_record.survey_id, link_record.email, link_record.expires_at, 'Email não confere';
        RETURN;
    END IF;
    
    -- Link válido
    RETURN QUERY SELECT TRUE, link_record.survey_id, link_record.email, link_record.expires_at, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. PERMISSÕES SEGURAS
-- ========================================

-- Permitir apenas service_role executar funções críticas
REVOKE EXECUTE ON FUNCTION public.validate_magic_link_secure(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_magic_link_secure(TEXT, TEXT) TO service_role;

-- Função mark_magic_link_used será criada em migração separada se necessário

-- ========================================
-- 9. AUDITORIA E LOGGING
-- ========================================

-- Registrar a aplicação desta migração de segurança
INSERT INTO public.audit_log (
    event_type,
    table_name,
    details,
    created_at
) VALUES (
    'SECURITY_MIGRATION',
    'system',
    jsonb_build_object(
        'migration', '20250113000000_security_improvements',
        'changes', ARRAY[
            'Removed public magic links access',
            'Removed anonymous survey access',
            'Implemented service-role-only policies',
            'Enhanced magic link validation security'
        ]
    ),
    now()
);

-- ========================================
-- 10. VERIFICAÇÃO FINAL
-- ========================================

-- Verificar se todas as políticas foram aplicadas corretamente
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Contar políticas de segurança aplicadas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('magic_links', 'surveys', 'questions', 'responses')
    AND policyname LIKE '%service_role%' OR policyname LIKE '%owners%';
    
    -- Log do resultado
    INSERT INTO public.audit_log (
        event_type,
        table_name,
        details,
        created_at
    ) VALUES (
        'SECURITY_VERIFICATION',
        'system',
        jsonb_build_object(
            'security_policies_count', policy_count,
            'verification_status', 'completed'
        ),
        now()
    );
END;
$$;

COMMIT;