-- Migração para implementar sistema de Magic Links
-- Criação das tabelas magic_links e atualização das políticas RLS

-- 1. CRIAR TABELA MAGIC_LINKS
CREATE TABLE IF NOT EXISTS public.magic_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Índices para performance
    CONSTRAINT magic_links_token_unique UNIQUE (token),
    CONSTRAINT magic_links_expires_at_check CHECK (expires_at > created_at)
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON public.magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON public.magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_survey_id ON public.magic_links(survey_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON public.magic_links(expires_at);

-- Habilitar RLS na tabela magic_links
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS RLS PARA MAGIC_LINKS
-- Política para que apenas o dono da pesquisa possa ver os magic links
CREATE POLICY "survey_owners_view_magic_links" ON public.magic_links
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = magic_links.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Política para que apenas o dono da pesquisa possa criar magic links
CREATE POLICY "survey_owners_create_magic_links" ON public.magic_links
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = magic_links.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Política para que apenas o dono da pesquisa possa atualizar magic links
CREATE POLICY "survey_owners_update_magic_links" ON public.magic_links
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = magic_links.survey_id 
            AND surveys.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = magic_links.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- 3. ATUALIZAR POLÍTICAS RLS DA TABELA RESPONSES
-- Remover políticas antigas que permitiam acesso anônimo
DROP POLICY IF EXISTS "Allow anonymous responses" ON public.responses;
DROP POLICY IF EXISTS "Public can submit responses" ON public.responses;
DROP POLICY IF EXISTS "Anonymous users can create responses" ON public.responses;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.responses;

-- Política para que usuários autenticados vejam apenas suas próprias respostas
CREATE POLICY "users_view_own_responses" ON public.responses
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL AND (
            -- Usuário é o dono da pesquisa
            EXISTS (
                SELECT 1 FROM public.surveys 
                WHERE surveys.id = responses.survey_id 
                AND surveys.user_id = auth.uid()
            )
            OR
            -- Usuário é quem respondeu (via magic link)
            responses.respondent_id = auth.uid()
        )
    );

-- Política para inserção de respostas via magic link autenticado
CREATE POLICY "authenticated_users_create_responses" ON public.responses
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        -- Verificar se existe um magic link válido para este usuário e pesquisa
        EXISTS (
            SELECT 1 FROM public.magic_links ml
            JOIN public.surveys s ON s.id = ml.survey_id
            WHERE ml.survey_id = responses.survey_id
            AND ml.expires_at > now()
            AND ml.used_at IS NULL
            AND s.status = 'active'
            AND s.current_responses < s.max_responses
        )
    );

-- 4. FUNÇÃO PARA VALIDAR MAGIC LINK
CREATE OR REPLACE FUNCTION public.validate_magic_link(
    _token TEXT,
    _email TEXT DEFAULT NULL
)
RETURNS TABLE (
    valid BOOLEAN,
    survey_id UUID,
    email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
) AS $$
DECLARE
    link_record RECORD;
BEGIN
    -- Buscar o magic link
    SELECT ml.*, s.status as survey_status, s.current_responses, s.max_responses
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNÇÃO PARA MARCAR MAGIC LINK COMO USADO
CREATE OR REPLACE FUNCTION public.mark_magic_link_used(
    _token TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.magic_links 
    SET used_at = now()
    WHERE token = _token 
    AND used_at IS NULL 
    AND expires_at > now();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNÇÃO PARA LIMPEZA AUTOMÁTICA DE LINKS EXPIRADOS
CREATE OR REPLACE FUNCTION public.cleanup_expired_magic_links()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.magic_links 
    WHERE expires_at < now() - INTERVAL '7 days'; -- Manter por 7 dias após expirar para auditoria
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da limpeza
    INSERT INTO public.audit_log (
        event_type,
        table_name,
        details,
        created_at
    ) VALUES (
        'CLEANUP',
        'magic_links',
        jsonb_build_object('deleted_count', deleted_count),
        now()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER PARA AUDITORIA DE MAGIC LINKS
CREATE OR REPLACE FUNCTION public.audit_magic_link_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_log (
        event_type,
        table_name,
        record_id,
        user_id,
        details,
        created_at
    ) VALUES (
        TG_OP,
        'magic_links',
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        CASE 
            WHEN TG_OP = 'INSERT' THEN jsonb_build_object(
                'email', NEW.email,
                'survey_id', NEW.survey_id,
                'expires_at', NEW.expires_at
            )
            WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
                'old_used_at', OLD.used_at,
                'new_used_at', NEW.used_at,
                'email', NEW.email,
                'survey_id', NEW.survey_id
            )
            WHEN TG_OP = 'DELETE' THEN jsonb_build_object(
                'email', OLD.email,
                'survey_id', OLD.survey_id,
                'was_used', OLD.used_at IS NOT NULL
            )
        END,
        now()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para auditoria
CREATE TRIGGER audit_magic_links_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.magic_links
    FOR EACH ROW EXECUTE FUNCTION public.audit_magic_link_changes();

-- 8. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON TABLE public.magic_links IS 'Tabela para armazenar magic links temporários para autenticação de respondentes';
COMMENT ON COLUMN public.magic_links.token IS 'Token único e seguro para autenticação';
COMMENT ON COLUMN public.magic_links.email IS 'Email do respondente para validação adicional';
COMMENT ON COLUMN public.magic_links.survey_id IS 'ID da pesquisa associada ao magic link';
COMMENT ON COLUMN public.magic_links.expires_at IS 'Data e hora de expiração do link';
COMMENT ON COLUMN public.magic_links.used_at IS 'Data e hora em que o link foi utilizado (NULL se não usado)';

COMMENT ON FUNCTION public.validate_magic_link(TEXT, TEXT) IS 'Valida um magic link e retorna informações sobre sua validade';
COMMENT ON FUNCTION public.mark_magic_link_used(TEXT) IS 'Marca um magic link como usado';
COMMENT ON FUNCTION public.cleanup_expired_magic_links() IS 'Remove magic links expirados há mais de 7 dias';

-- 9. GRANT PERMISSIONS
-- Permitir que usuários autenticados executem as funções
GRANT EXECUTE ON FUNCTION public.validate_magic_link(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_magic_link_used(TEXT) TO authenticated;

-- Permitir acesso às tabelas para usuários autenticados
GRANT SELECT, INSERT, UPDATE ON public.magic_links TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;

-- 10. CONFIGURAR LIMPEZA AUTOMÁTICA (opcional - requer extensão pg_cron)
-- SELECT cron.schedule('cleanup-expired-magic-links', '0 2 * * *', 'SELECT public.cleanup_expired_magic_links();');

COMMIT;