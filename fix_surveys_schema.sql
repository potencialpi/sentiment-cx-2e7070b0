-- Script para corrigir o schema da tabela surveys
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Remover coluna 'questions' da tabela surveys se existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'questions'
    ) THEN
        ALTER TABLE public.surveys DROP COLUMN questions;
        RAISE NOTICE 'Coluna questions removida da tabela surveys';
    ELSE
        RAISE NOTICE 'Coluna questions não existe na tabela surveys';
    END IF;
END $$;

-- 2. Remover coluna 'question' da tabela surveys se existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'question'
    ) THEN
        ALTER TABLE public.surveys DROP COLUMN question;
        RAISE NOTICE 'Coluna question removida da tabela surveys';
    ELSE
        RAISE NOTICE 'Coluna question não existe na tabela surveys';
    END IF;
END $$;

-- 3. Verificar e adicionar colunas necessárias se não existirem
DO $$ 
BEGIN
    -- Adicionar coluna unique_link se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'unique_link'
    ) THEN
        ALTER TABLE public.surveys ADD COLUMN unique_link text UNIQUE;
        RAISE NOTICE 'Coluna unique_link adicionada à tabela surveys';
    END IF;
    
    -- Adicionar coluna current_responses se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'current_responses'
    ) THEN
        ALTER TABLE public.surveys ADD COLUMN current_responses integer NOT NULL DEFAULT 0;
        RAISE NOTICE 'Coluna current_responses adicionada à tabela surveys';
    END IF;
    
    -- Adicionar coluna status se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.surveys ADD COLUMN status text NOT NULL DEFAULT 'active';
        RAISE NOTICE 'Coluna status adicionada à tabela surveys';
    END IF;
END $$;

-- 4. Verificar a estrutura final da tabela surveys
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'surveys'
ORDER BY ordinal_position;

-- 5. Limpar cache do schema (se necessário)
-- REFRESH MATERIALIZED VIEW IF EXISTS pg_stat_statements;

RAISE NOTICE 'Script de correção do schema executado com sucesso!';