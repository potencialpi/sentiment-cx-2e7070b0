-- SCRIPT COMPLETO DE CORREÇÃO DO BANCO DE DADOS SUPABASE
-- Execute este script no SQL Editor do Supabase Dashboard

-- =====================================================
-- 1. CRIAR/CORRIGIR TABELA PROFILES
-- =====================================================

-- Criar tabela profiles se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'start-quantico',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar colunas faltantes na tabela profiles
DO $$ 
BEGIN
    -- Verificar e corrigir coluna plan_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'plan_type') THEN
        ALTER TABLE public.profiles RENAME COLUMN plan_type TO plan_name;
    END IF;
    
    -- Adicionar coluna status se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    END IF;
END $$;

-- =====================================================
-- 2. CRIAR/CORRIGIR TABELA COMPANIES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    plan_name TEXT NOT NULL CHECK (plan_name IN ('start-quantico', 'vortex-neural', 'nexus-infinito')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. CRIAR/CORRIGIR TABELA SURVEYS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  unique_link TEXT UNIQUE,
  max_responses INTEGER NOT NULL DEFAULT 100,
  current_responses INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Remover colunas problemáticas da tabela surveys
DO $$ 
BEGIN
    -- Remover coluna questions se existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'questions') THEN
        ALTER TABLE public.surveys DROP COLUMN questions;
    END IF;
    
    -- Remover coluna question se existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'question') THEN
        ALTER TABLE public.surveys DROP COLUMN question;
    END IF;
    
    -- Remover coluna is_active se existir (substituída por status)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'is_active') THEN
        ALTER TABLE public.surveys DROP COLUMN is_active;
    END IF;
    
    -- Remover coluna unique_link_id se existir (substituída por unique_link)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'unique_link_id') THEN
        ALTER TABLE public.surveys DROP COLUMN unique_link_id;
    END IF;
    
    -- Adicionar colunas necessárias se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'unique_link') THEN
        ALTER TABLE public.surveys ADD COLUMN unique_link TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'current_responses') THEN
        ALTER TABLE public.surveys ADD COLUMN current_responses INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'status') THEN
        ALTER TABLE public.surveys ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    END IF;
END $$;

-- =====================================================
-- 4. CRIAR/CORRIGIR TABELA QUESTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'rating', 'single_choice', 'multiple_choice')),
  question_order INTEGER NOT NULL DEFAULT 1,
  options JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 5. CRIAR/CORRIGIR TABELA RESPONSES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_id UUID NOT NULL DEFAULT gen_random_uuid(),
  responses JSONB NOT NULL,
  sentiment_score INTEGER,
  sentiment_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Corrigir estrutura da tabela responses
DO $$ 
BEGIN
    -- Remover coluna answers se existir (substituída por responses)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'answers') THEN
        ALTER TABLE public.responses DROP COLUMN answers;
    END IF;
    
    -- Remover coluna respondent_ip se existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'respondent_ip') THEN
        ALTER TABLE public.responses DROP COLUMN respondent_ip;
    END IF;
    
    -- Adicionar colunas necessárias se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'respondent_id') THEN
        ALTER TABLE public.responses ADD COLUMN respondent_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'responses') THEN
        ALTER TABLE public.responses ADD COLUMN responses JSONB NOT NULL DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'sentiment_score') THEN
        ALTER TABLE public.responses ADD COLUMN sentiment_score INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'sentiment_category') THEN
        ALTER TABLE public.responses ADD COLUMN sentiment_category TEXT;
    END IF;
END $$;

-- =====================================================
-- 6. CRIAR/CORRIGIR TABELA QUESTION_RESPONSES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.question_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_rating INTEGER,
  answer_choices JSONB,
  sentiment_score DECIMAL(3,2),
  sentiment_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 7. CRIAR/CORRIGIR TABELA RESPONDENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.respondents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- =====================================================
-- 8. CRIAR FUNÇÃO PARA ATUALIZAR TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. CRIAR TRIGGERS PARA ATUALIZAR TIMESTAMPS
-- =====================================================

-- Trigger para profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para companies
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para surveys
DROP TRIGGER IF EXISTS update_surveys_updated_at ON public.surveys;
CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para questions
DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para respondents
DROP TRIGGER IF EXISTS update_respondents_updated_at ON public.respondents;
CREATE TRIGGER update_respondents_updated_at
  BEFORE UPDATE ON public.respondents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 10. HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respondents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. CRIAR POLÍTICAS RLS
-- =====================================================

-- Políticas para profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para companies
DROP POLICY IF EXISTS "Users can view their own company data" ON public.companies;
DROP POLICY IF EXISTS "Users can create their own company data" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company data" ON public.companies;

CREATE POLICY "Users can view their own company data" 
ON public.companies FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company data" 
ON public.companies FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company data" 
ON public.companies FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para surveys
DROP POLICY IF EXISTS "Users can view their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can create their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can update their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can delete their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Anyone can view active surveys by link" ON public.surveys;

CREATE POLICY "Users can view their own surveys" 
ON public.surveys FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own surveys" 
ON public.surveys FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own surveys" 
ON public.surveys FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own surveys" 
ON public.surveys FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active surveys by link" 
ON public.surveys FOR SELECT TO anon, authenticated
USING (status = 'active' AND unique_link IS NOT NULL);

-- Políticas para questions
DROP POLICY IF EXISTS "Users can view questions from their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can create questions for their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can update questions from their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can delete questions from their surveys" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions from active surveys" ON public.questions;

CREATE POLICY "Users can view questions from their surveys" 
ON public.questions FOR SELECT TO authenticated
USING (survey_id IN (SELECT id FROM public.surveys WHERE user_id = auth.uid()));

CREATE POLICY "Users can create questions for their surveys" 
ON public.questions FOR INSERT TO authenticated
WITH CHECK (survey_id IN (SELECT id FROM public.surveys WHERE user_id = auth.uid()));

CREATE POLICY "Users can update questions from their surveys" 
ON public.questions FOR UPDATE TO authenticated
USING (survey_id IN (SELECT id FROM public.surveys WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete questions from their surveys" 
ON public.questions FOR DELETE TO authenticated
USING (survey_id IN (SELECT id FROM public.surveys WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view questions from active surveys" 
ON public.questions FOR SELECT TO anon, authenticated
USING (survey_id IN (SELECT id FROM public.surveys WHERE status = 'active' AND unique_link IS NOT NULL));

-- Políticas para responses
DROP POLICY IF EXISTS "Users can view responses to their surveys" ON public.responses;
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;

CREATE POLICY "Users can view responses to their surveys" 
ON public.responses FOR SELECT TO authenticated
USING (survey_id IN (SELECT id FROM public.surveys WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can insert responses" 
ON public.responses FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Políticas para question_responses
DROP POLICY IF EXISTS "Users can view responses to their questions" ON public.question_responses;
DROP POLICY IF EXISTS "Anyone can insert question responses" ON public.question_responses;

CREATE POLICY "Users can view responses to their questions" 
ON public.question_responses FOR SELECT TO authenticated
USING (question_id IN (
  SELECT q.id FROM public.questions q
  JOIN public.surveys s ON q.survey_id = s.id
  WHERE s.user_id = auth.uid()
));

CREATE POLICY "Anyone can insert question responses" 
ON public.question_responses FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Políticas para respondents
DROP POLICY IF EXISTS "Users can view their own respondents" ON public.respondents;
DROP POLICY IF EXISTS "Users can create their own respondents" ON public.respondents;
DROP POLICY IF EXISTS "Users can update their own respondents" ON public.respondents;
DROP POLICY IF EXISTS "Users can delete their own respondents" ON public.respondents;

CREATE POLICY "Users can view their own respondents" 
ON public.respondents FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own respondents" 
ON public.respondents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own respondents" 
ON public.respondents FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own respondents" 
ON public.respondents FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 12. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON public.surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_surveys_unique_link ON public.surveys(unique_link);
CREATE INDEX IF NOT EXISTS idx_questions_survey_id ON public.questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON public.responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_question_id ON public.question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_response_id ON public.question_responses(response_id);
CREATE INDEX IF NOT EXISTS idx_respondents_user_id ON public.respondents(user_id);
CREATE INDEX IF NOT EXISTS idx_respondents_email ON public.respondents(email);

-- =====================================================
-- 13. CORRIGIR NOMES DE PLANOS
-- =====================================================

-- Corrigir nomes de planos na tabela profiles
UPDATE public.profiles 
SET plan_name = 'start-quantico' 
WHERE plan_name IN ('start_quantico', 'start_quantico');

UPDATE public.profiles 
SET plan_name = 'vortex-neural' 
WHERE plan_name IN ('vortex_neural', 'vortex_neural');

UPDATE public.profiles 
SET plan_name = 'nexus-infinito' 
WHERE plan_name IN ('nexus_infinito', 'nexus_infinito');

-- Corrigir nomes de planos na tabela companies
UPDATE public.companies 
SET plan_name = 'start-quantico' 
WHERE plan_name IN ('start_quantico', 'start_quantico');

UPDATE public.companies 
SET plan_name = 'vortex-neural' 
WHERE plan_name IN ('vortex_neural', 'vortex_neural');

UPDATE public.companies 
SET plan_name = 'nexus-infinito' 
WHERE plan_name IN ('nexus_infinito', 'nexus_infinito');

-- Alterar valor padrão da tabela profiles
ALTER TABLE public.profiles 
ALTER COLUMN plan_name SET DEFAULT 'start-quantico';

-- =====================================================
-- 14. VERIFICAÇÃO FINAL
-- =====================================================

SELECT 'TABELAS CRIADAS/CORRIGIDAS:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'companies', 'surveys', 'questions', 'responses', 'question_responses', 'respondents')
ORDER BY table_name;

SELECT '\n🎯 CORREÇÃO COMPLETA DO BANCO DE DADOS FINALIZADA!' as resultado;
SELECT 'Todas as tabelas, colunas, políticas RLS e índices foram criados/corrigidos.' as detalhes;