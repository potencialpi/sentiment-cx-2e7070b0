-- Remover coluna 'questions' da tabela surveys se existir
-- Esta coluna foi substituída pela tabela separada 'questions'

DO $$ 
BEGIN
    -- Verificar se a coluna 'questions' existe na tabela surveys
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'questions'
    ) THEN
        -- Remover a coluna questions da tabela surveys
        ALTER TABLE public.surveys DROP COLUMN questions;
    END IF;
END $$;

-- Verificar se a coluna 'question' existe na tabela surveys e removê-la se existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'question'
    ) THEN
        ALTER TABLE public.surveys DROP COLUMN question;
    END IF;
END $$;

-- Garantir que a estrutura da tabela surveys está correta
-- Verificar se todas as colunas necessárias existem
DO $$ 
BEGIN
    -- Adicionar coluna unique_link se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'unique_link'
    ) THEN
        ALTER TABLE public.surveys ADD COLUMN unique_link text UNIQUE;
    END IF;
    
    -- Adicionar coluna current_responses se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'current_responses'
    ) THEN
        ALTER TABLE public.surveys ADD COLUMN current_responses integer NOT NULL DEFAULT 0;
    END IF;
    
    -- Adicionar coluna status se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.surveys ADD COLUMN status text NOT NULL DEFAULT 'active';
    END IF;
END $$;