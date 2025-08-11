-- Script para corrigir políticas RLS específicas para SurveyResponse
-- Execute este script no Supabase Dashboard > SQL Editor

-- Habilitar RLS nas tabelas necessárias
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer pessoa veja pesquisas ativas com unique_link
DROP POLICY IF EXISTS "Anyone can view active surveys with unique_link" ON public.surveys;
CREATE POLICY "Anyone can view active surveys with unique_link" ON public.surveys
    FOR SELECT USING (
        status = 'active' AND unique_link IS NOT NULL
    );

-- Política para permitir que qualquer pessoa veja perguntas de pesquisas ativas
DROP POLICY IF EXISTS "Anyone can view questions from active surveys" ON public.questions;
CREATE POLICY "Anyone can view questions from active surveys" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.status = 'active' 
            AND surveys.unique_link IS NOT NULL
        )
    );

-- Política para permitir que qualquer pessoa insira respostas
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
CREATE POLICY "Anyone can insert responses" ON public.responses
    FOR INSERT WITH CHECK (true);

-- Política para permitir que proprietários vejam respostas de suas pesquisas
DROP POLICY IF EXISTS "Users can view responses from own surveys" ON public.responses;
CREATE POLICY "Users can view responses from own surveys" ON public.responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Política para permitir que proprietários atualizem suas pesquisas (contador de respostas)
DROP POLICY IF EXISTS "Users can update own surveys" ON public.surveys;
CREATE POLICY "Users can update own surveys" ON public.surveys
    FOR UPDATE USING (user_id = auth.uid());

-- Política para permitir que proprietários vejam suas próprias pesquisas
DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;
CREATE POLICY "Users can view own surveys" ON public.surveys
    FOR SELECT USING (user_id = auth.uid());

-- Política para permitir que proprietários criem pesquisas
DROP POLICY IF EXISTS "Users can create own surveys" ON public.surveys;
CREATE POLICY "Users can create own surveys" ON public.surveys
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política para permitir que proprietários deletem suas pesquisas
DROP POLICY IF EXISTS "Users can delete own surveys" ON public.surveys;
CREATE POLICY "Users can delete own surveys" ON public.surveys
    FOR DELETE USING (user_id = auth.uid());

-- Política para permitir que proprietários vejam perguntas de suas pesquisas
DROP POLICY IF EXISTS "Users can view questions from own surveys" ON public.questions;
CREATE POLICY "Users can view questions from own surveys" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Política para permitir que proprietários criem perguntas em suas pesquisas
DROP POLICY IF EXISTS "Users can create questions in own surveys" ON public.questions;
CREATE POLICY "Users can create questions in own surveys" ON public.questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Política para permitir que proprietários atualizem perguntas de suas pesquisas
DROP POLICY IF EXISTS "Users can update questions from own surveys" ON public.questions;
CREATE POLICY "Users can update questions from own surveys" ON public.questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Política para permitir que proprietários deletem perguntas de suas pesquisas
DROP POLICY IF EXISTS "Users can delete questions from own surveys" ON public.questions;
CREATE POLICY "Users can delete questions from own surveys" ON public.questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

SELECT 'Políticas RLS para SurveyResponse aplicadas com sucesso!' as status;