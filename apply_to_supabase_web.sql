-- ================================================
-- SCRIPT PARA APLICAR NO SUPABASE.COM
-- Execute este SQL no SQL Editor do Supabase Studio
-- ================================================

-- 1. CRIAR FUNÇÃO AUXILIAR (se não existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- 2. CRIAR TABELA PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'start_quantico',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. CRIAR TABELA SURVEYS
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

-- 4. CRIAR TABELA RESPONSES
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_id UUID NOT NULL DEFAULT gen_random_uuid(),
  responses JSONB NOT NULL,
  sentiment_score INTEGER,
  sentiment_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. CRIAR TABELA QUESTIONS
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

-- 6. CRIAR TABELA COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. CRIAR TABELA QUESTION_RESPONSES (se necessário)
CREATE TABLE IF NOT EXISTS public.question_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  response_text TEXT,
  response_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================================
-- HABILITAR ROW LEVEL SECURITY
-- ================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- ================================================
-- POLÍTICAS RLS - PROFILES
-- ================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ================================================
-- POLÍTICAS RLS - SURVEYS
-- ================================================

DROP POLICY IF EXISTS "Users can view active surveys" ON public.surveys;
CREATE POLICY "Users can view active surveys" 
ON public.surveys 
FOR SELECT 
USING (status = 'active' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own surveys" ON public.surveys;
CREATE POLICY "Users can manage their own surveys" 
ON public.surveys 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ================================================
-- POLÍTICAS RLS - QUESTIONS
-- ================================================

DROP POLICY IF EXISTS "Anyone can view questions from active surveys" ON public.questions;
CREATE POLICY "Anyone can view questions from active surveys" 
ON public.questions 
FOR SELECT 
USING (survey_id IN (
  SELECT id FROM public.surveys WHERE status = 'active'
));

DROP POLICY IF EXISTS "Users can manage questions for their surveys" ON public.questions;
CREATE POLICY "Users can manage questions for their surveys" 
ON public.questions 
FOR ALL 
USING (survey_id IN (
  SELECT id FROM public.surveys WHERE user_id = auth.uid()
)) 
WITH CHECK (survey_id IN (
  SELECT id FROM public.surveys WHERE user_id = auth.uid()
));

-- ================================================
-- POLÍTICAS RLS - RESPONSES
-- ================================================

DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
CREATE POLICY "Anyone can insert responses" 
ON public.responses 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view responses to their surveys" ON public.responses;
CREATE POLICY "Users can view responses to their surveys" 
ON public.responses 
FOR SELECT 
USING (survey_id IN (
  SELECT id FROM public.surveys WHERE user_id = auth.uid()
));

-- ================================================
-- POLÍTICAS RLS - COMPANIES
-- ================================================

DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" 
ON public.companies 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own company" ON public.companies;
CREATE POLICY "Users can manage their own company" 
ON public.companies 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ================================================
-- POLÍTICAS RLS - QUESTION_RESPONSES
-- ================================================

DROP POLICY IF EXISTS "Anyone can insert question responses" ON public.question_responses;
CREATE POLICY "Anyone can insert question responses" 
ON public.question_responses 
FOR INSERT 
WITH CHECK (true);

-- ================================================
-- TRIGGERS
-- ================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_surveys_updated_at ON public.surveys;
CREATE TRIGGER update_surveys_updated_at
BEFORE UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- FUNÇÃO E TRIGGER PARA CRIAR COMPANY AUTOMATICAMENTE
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.companies (user_id, name)
  VALUES (NEW.id, 'Minha Empresa');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- FINALIZADO!
-- ================================================
-- Execute este script completo no SQL Editor do Supabase
-- Todas as tabelas, políticas RLS e triggers serão criados