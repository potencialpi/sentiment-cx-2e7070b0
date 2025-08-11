-- Script para corrigir políticas RLS que estão bloqueando o acesso às tabelas

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela surveys
DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;
CREATE POLICY "Users can view own surveys" ON public.surveys
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own surveys" ON public.surveys;
CREATE POLICY "Users can insert own surveys" ON public.surveys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own surveys" ON public.surveys;
CREATE POLICY "Users can update own surveys" ON public.surveys
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own surveys" ON public.surveys;
CREATE POLICY "Users can delete own surveys" ON public.surveys
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para tabela questions
DROP POLICY IF EXISTS "Users can view questions from own surveys" ON public.questions;
CREATE POLICY "Users can view questions from own surveys" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert questions to own surveys" ON public.questions;
CREATE POLICY "Users can insert questions to own surveys" ON public.questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update questions from own surveys" ON public.questions;
CREATE POLICY "Users can update questions from own surveys" ON public.questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete questions from own surveys" ON public.questions;
CREATE POLICY "Users can delete questions from own surveys" ON public.questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Políticas para tabela responses
DROP POLICY IF EXISTS "Users can view responses from own surveys" ON public.responses;
CREATE POLICY "Users can view responses from own surveys" ON public.responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
CREATE POLICY "Anyone can insert responses" ON public.responses
    FOR INSERT WITH CHECK (true);

-- Políticas para tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);