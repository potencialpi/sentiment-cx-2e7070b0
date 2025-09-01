-- Migração para criar tabela magic_links
-- Execute este SQL no Dashboard do Supabase: SQL Editor

-- 1. CRIAR TABELA MAGIC_LINKS
CREATE TABLE IF NOT EXISTS public.magic_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT magic_links_token_unique UNIQUE (token),
    CONSTRAINT magic_links_expires_at_check CHECK (expires_at > created_at)
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON public.magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON public.magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_survey_id ON public.magic_links(survey_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON public.magic_links(expires_at);

-- 3. HABILITAR RLS
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS PARA MAGIC_LINKS
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
);

-- 5. FUNÇÃO PARA LIMPEZA DE LINKS EXPIRADOS
CREATE OR REPLACE FUNCTION public.cleanup_expired_magic_links()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.magic_links
    WHERE expires_at < (now() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE public.magic_links IS 'Tabela para armazenar magic links temporários para autenticação de respondentes';
COMMENT ON COLUMN public.magic_links.token IS 'Token único e seguro para autenticação';
COMMENT ON COLUMN public.magic_links.email IS 'Email do respondente para validação adicional';
COMMENT ON COLUMN public.magic_links.survey_id IS 'ID da pesquisa associada ao magic link';
COMMENT ON COLUMN public.magic_links.expires_at IS 'Data e hora de expiração do link';
COMMENT ON COLUMN public.magic_links.used_at IS 'Data e hora em que o link foi utilizado (NULL se não usado)';

-- 7. PERMISSÕES
GRANT SELECT, INSERT, UPDATE ON public.magic_links TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;