-- SCRIPT PARA CRIAR TABELA MAGIC_LINKS
-- Execute este script no Dashboard do Supabase > SQL Editor

-- Criar tabela magic_links
CREATE TABLE IF NOT EXISTS public.magic_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON public.magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON public.magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_survey_id ON public.magic_links(survey_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON public.magic_links(expires_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de magic links (para Edge Functions)
CREATE POLICY "Allow service role to manage magic links" ON public.magic_links
    FOR ALL USING (auth.role() = 'service_role');

-- Política para permitir leitura de magic links válidos
CREATE POLICY "Allow reading valid magic links" ON public.magic_links
    FOR SELECT USING (
        expires_at > NOW() AND used_at IS NULL
    );

-- Comentários para documentação
COMMENT ON TABLE public.magic_links IS 'Tabela para armazenar magic links de autenticação temporária';
COMMENT ON COLUMN public.magic_links.email IS 'Email do usuário que receberá o magic link';
COMMENT ON COLUMN public.magic_links.token IS 'Token único e seguro para autenticação';
COMMENT ON COLUMN public.magic_links.survey_id IS 'ID da pesquisa associada ao magic link';
COMMENT ON COLUMN public.magic_links.expires_at IS 'Data e hora de expiração do magic link';
COMMENT ON COLUMN public.magic_links.used_at IS 'Data e hora em que o magic link foi usado (NULL se não usado)';

-- Verificar se a tabela foi criada com sucesso
SELECT 
    'Tabela magic_links criada com sucesso!' as status,
    COUNT(*) as total_registros
FROM public.magic_links;