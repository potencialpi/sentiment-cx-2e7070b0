-- Migração para criar tabela magic_links
-- Sistema de autenticação via magic link para respondentes
-- Conformidade LGPD: rastreabilidade e controle de acesso

CREATE TABLE IF NOT EXISTS public.magic_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT magic_links_token_unique UNIQUE (token),
    CONSTRAINT magic_links_expires_check CHECK (expires_at > created_at)
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON public.magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON public.magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_survey_id ON public.magic_links(survey_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON public.magic_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_links_used_at ON public.magic_links(used_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_magic_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_magic_links_updated_at
    BEFORE UPDATE ON public.magic_links
    FOR EACH ROW
    EXECUTE FUNCTION update_magic_links_updated_at();

-- Habilitar RLS na tabela
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

-- Política RLS: Apenas o proprietário da pesquisa pode gerenciar magic links
CREATE POLICY "magic_links_owner_access" ON public.magic_links
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

-- Política RLS: Acesso público para validação de tokens (apenas SELECT)
CREATE POLICY "magic_links_public_validation" ON public.magic_links
    FOR SELECT
    USING (
        token IS NOT NULL 
        AND expires_at > NOW() 
        AND used_at IS NULL
    );

-- Função para limpeza automática de tokens expirados (executar via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.magic_links 
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log para auditoria LGPD
    INSERT INTO public.audit_logs (action, table_name, details, created_at)
    VALUES (
        'cleanup_expired_magic_links',
        'magic_links',
        jsonb_build_object('deleted_count', deleted_count),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE public.magic_links IS 'Tabela para armazenar magic links de autenticação de respondentes - Conformidade LGPD';
COMMENT ON COLUMN public.magic_links.email IS 'Email do respondente (dado pessoal protegido pela LGPD)';
COMMENT ON COLUMN public.magic_links.token IS 'Token único e temporário para autenticação';
COMMENT ON COLUMN public.magic_links.survey_id IS 'Referência à pesquisa associada';
COMMENT ON COLUMN public.magic_links.expires_at IS 'Data/hora de expiração do token (máximo 24h)';
COMMENT ON COLUMN public.magic_links.used_at IS 'Data/hora de uso do token (controle de uso único)';
COMMENT ON FUNCTION cleanup_expired_magic_links() IS 'Função para limpeza automática de tokens expirados - Conformidade LGPD';