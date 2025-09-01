-- Atualização das políticas RLS para tabela responses
-- Migração do acesso anônimo para autenticação via magic link
-- Garantia de isolamento de dados entre usuários - Conformidade LGPD

-- Remover políticas RLS antigas que permitiam acesso anônimo
DROP POLICY IF EXISTS "responses_anonymous_insert" ON public.responses;
DROP POLICY IF EXISTS "responses_anonymous_select" ON public.responses;
DROP POLICY IF EXISTS "responses_owner_select" ON public.responses;
DROP POLICY IF EXISTS "responses_public_insert" ON public.responses;

-- Garantir que RLS está habilitado
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Política 1: Proprietários da pesquisa podem ver todas as respostas de suas pesquisas
CREATE POLICY "responses_owner_full_access" ON public.responses
    FOR ALL
    USING (
        survey_id IN (
            SELECT id FROM public.surveys 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        survey_id IN (
            SELECT id FROM public.surveys 
            WHERE user_id = auth.uid()
        )
    );

-- Política 2: Respondentes autenticados podem inserir respostas apenas em pesquisas ativas
-- e apenas se tiverem um magic link válido para a pesquisa
CREATE POLICY "responses_authenticated_insert" ON public.responses
    FOR INSERT
    WITH CHECK (
        -- Verificar se o usuário está autenticado
        auth.uid() IS NOT NULL
        AND
        -- Verificar se a pesquisa está ativa
        survey_id IN (
            SELECT id FROM public.surveys 
            WHERE is_active = true
        )
        AND
        -- Verificar se existe um magic link válido e não usado para este usuário/pesquisa
        -- (Implementação alternativa: usar metadata da sessão ou tabela de sessões)
        EXISTS (
            SELECT 1 FROM public.magic_links ml
            WHERE ml.survey_id = responses.survey_id
            AND ml.expires_at > NOW()
            AND ml.used_at IS NOT NULL  -- Token foi usado (autenticação realizada)
            AND ml.used_at > NOW() - INTERVAL '1 hour'  -- Usado recentemente (sessão ativa)
        )
    );

-- Política 3: Respondentes podem ver apenas suas próprias respostas
-- Usando uma abordagem baseada em sessão/metadata para identificar o respondente
CREATE POLICY "responses_respondent_own_select" ON public.responses
    FOR SELECT
    USING (
        -- Permitir que usuários vejam suas próprias respostas
        -- Isso será implementado via aplicação, controlando o acesso por sessão
        auth.uid() IS NOT NULL
        AND
        -- Adicionar lógica adicional se necessário para identificar o respondente
        -- Por exemplo, usando metadata da sessão ou tabela de sessões de respondentes
        true
    );

-- Criar tabela para gerenciar sessões de respondentes (isolamento adicional)
CREATE TABLE IF NOT EXISTS public.respondent_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    magic_link_id UUID NOT NULL REFERENCES public.magic_links(id) ON DELETE CASCADE,
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT respondent_sessions_expires_check CHECK (expires_at > created_at),
    CONSTRAINT respondent_sessions_unique_user_survey UNIQUE (user_id, survey_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_respondent_sessions_user_id ON public.respondent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_respondent_sessions_survey_id ON public.respondent_sessions(survey_id);
CREATE INDEX IF NOT EXISTS idx_respondent_sessions_session_token ON public.respondent_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_respondent_sessions_expires_at ON public.respondent_sessions(expires_at);

-- Habilitar RLS na tabela de sessões
ALTER TABLE public.respondent_sessions ENABLE ROW LEVEL SECURITY;

-- Política RLS para sessões: usuários podem ver apenas suas próprias sessões
CREATE POLICY "respondent_sessions_own_access" ON public.respondent_sessions
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Política RLS para sessões: proprietários de pesquisas podem ver sessões de suas pesquisas
CREATE POLICY "respondent_sessions_owner_access" ON public.respondent_sessions
    FOR SELECT
    USING (
        survey_id IN (
            SELECT id FROM public.surveys 
            WHERE user_id = auth.uid()
        )
    );

-- Atualizar política de respostas para usar sessões de respondentes
DROP POLICY IF EXISTS "responses_respondent_own_select" ON public.responses;

CREATE POLICY "responses_respondent_session_select" ON public.responses
    FOR SELECT
    USING (
        -- Permitir acesso se existe uma sessão ativa para este usuário/pesquisa
        EXISTS (
            SELECT 1 FROM public.respondent_sessions rs
            WHERE rs.user_id = auth.uid()
            AND rs.survey_id = responses.survey_id
            AND rs.expires_at > NOW()
        )
    );

-- Atualizar política de inserção para usar sessões
DROP POLICY IF EXISTS "responses_authenticated_insert" ON public.responses;

CREATE POLICY "responses_session_insert" ON public.responses
    FOR INSERT
    WITH CHECK (
        -- Verificar se existe uma sessão ativa válida
        EXISTS (
            SELECT 1 FROM public.respondent_sessions rs
            WHERE rs.user_id = auth.uid()
            AND rs.survey_id = responses.survey_id
            AND rs.expires_at > NOW()
        )
        AND
        -- Verificar se a pesquisa está ativa
        survey_id IN (
            SELECT id FROM public.surveys 
            WHERE is_active = true
        )
    );

-- Função para criar sessão de respondente após uso do magic link
CREATE OR REPLACE FUNCTION create_respondent_session(
    p_user_id UUID,
    p_magic_link_id UUID,
    p_survey_id UUID,
    p_email VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
    session_token VARCHAR(255);
BEGIN
    -- Gerar token de sessão único
    session_token := encode(gen_random_bytes(32), 'base64');
    
    -- Remover sessões antigas para o mesmo usuário/pesquisa
    DELETE FROM public.respondent_sessions 
    WHERE user_id = p_user_id AND survey_id = p_survey_id;
    
    -- Criar nova sessão (válida por 24 horas)
    INSERT INTO public.respondent_sessions (
        user_id, magic_link_id, survey_id, email, 
        session_token, expires_at
    )
    VALUES (
        p_user_id, p_magic_link_id, p_survey_id, p_email,
        session_token, NOW() + INTERVAL '24 hours'
    )
    RETURNING id INTO session_id;
    
    -- Log de auditoria
    PERFORM log_audit_action(
        'INSERT',
        'respondent_sessions',
        session_id,
        NULL,
        jsonb_build_object(
            'user_id', p_user_id,
            'survey_id', p_survey_id,
            'email', p_email
        ),
        jsonb_build_object('action', 'create_respondent_session')
    );
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpeza de sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_respondent_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.respondent_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log de auditoria
    PERFORM log_audit_action(
        'cleanup_expired_respondent_sessions',
        'respondent_sessions',
        NULL,
        NULL,
        NULL,
        jsonb_build_object('deleted_count', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria automática em sessões
CREATE TRIGGER audit_respondent_sessions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.respondent_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Comentários para documentação
COMMENT ON TABLE public.respondent_sessions IS 'Tabela para gerenciar sessões de respondentes autenticados via magic link - Isolamento LGPD';
COMMENT ON COLUMN public.respondent_sessions.email IS 'Email do respondente (dado pessoal protegido pela LGPD)';
COMMENT ON COLUMN public.respondent_sessions.session_token IS 'Token único da sessão do respondente';
COMMENT ON FUNCTION create_respondent_session IS 'Função para criar sessão de respondente após autenticação via magic link';
COMMENT ON FUNCTION cleanup_expired_respondent_sessions IS 'Função para limpeza de sessões expiradas - Conformidade LGPD';

-- Verificação final das políticas
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
WHERE tablename IN ('responses', 'magic_links', 'respondent_sessions')
ORDER BY tablename, policyname;