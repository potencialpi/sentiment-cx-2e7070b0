-- Schema aplicação para Supabase Web
-- Execute este script no SQL Editor do Supabase Studio

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() 
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Criar função para nova empresa
CREATE OR REPLACE FUNCTION public.handle_new_user_company() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.companies (user_id, company_name, plan_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'Empresa'), 
    COALESCE(NEW.raw_user_meta_data ->> 'plan_name', 'start-quantico')
  );
  RETURN NEW;
END;
$$;

-- Tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_name text DEFAULT 'start_quantico'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

-- Tabela companies
CREATE TABLE IF NOT EXISTS public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    plan_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT companies_pkey PRIMARY KEY (id),
    CONSTRAINT companies_plan_name_check CHECK (plan_name = ANY (ARRAY['start-quantico'::text, 'vortex-neural'::text, 'nexus-infinito'::text]))
);

-- Tabela surveys
CREATE TABLE IF NOT EXISTS public.surveys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    unique_link text,
    max_responses integer DEFAULT 100 NOT NULL,
    current_responses integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT surveys_pkey PRIMARY KEY (id),
    CONSTRAINT surveys_unique_link_key UNIQUE (unique_link)
);

-- Tabela questions
CREATE TABLE IF NOT EXISTS public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    survey_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type text NOT NULL,
    question_order integer DEFAULT 1 NOT NULL,
    options jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT questions_pkey PRIMARY KEY (id),
    CONSTRAINT questions_question_type_check CHECK (question_type = ANY (ARRAY['text'::text, 'rating'::text, 'single_choice'::text, 'multiple_choice'::text]))
);

-- Tabela responses
CREATE TABLE IF NOT EXISTS public.responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    survey_id uuid NOT NULL,
    respondent_id uuid DEFAULT gen_random_uuid() NOT NULL,
    responses jsonb NOT NULL,
    sentiment_score integer,
    sentiment_category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT responses_pkey PRIMARY KEY (id)
);

-- Tabela question_responses
CREATE TABLE IF NOT EXISTS public.question_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    response_id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer_text text,
    answer_rating integer,
    answer_choices jsonb,
    sentiment_score numeric(3,2),
    sentiment_label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT question_responses_pkey PRIMARY KEY (id),
    CONSTRAINT question_responses_sentiment_label_check CHECK (sentiment_label = ANY (ARRAY['positive'::text, 'neutral'::text, 'negative'::text]))
);

-- Foreign Keys
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.surveys
    ADD CONSTRAINT surveys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.responses
    ADD CONSTRAINT responses_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_responses
    ADD CONSTRAINT question_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_responses
    ADD CONSTRAINT question_responses_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.responses(id) ON DELETE CASCADE;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies para companies
CREATE POLICY "Users can view their own company data" ON public.companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own company data" ON public.companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own company data" ON public.companies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies para surveys
CREATE POLICY "Users can view own surveys" ON public.surveys FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own surveys" ON public.surveys FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own surveys" ON public.surveys FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own surveys" ON public.surveys FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Anyone can view active surveys with unique_link" ON public.surveys FOR SELECT USING ((status = 'active'::text) AND (unique_link IS NOT NULL));

-- RLS Policies para questions
CREATE POLICY "Users can view questions from own surveys" ON public.questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.surveys WHERE (surveys.id = questions.survey_id) AND (surveys.user_id = auth.uid())));
CREATE POLICY "Users can create questions in own surveys" ON public.questions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.surveys WHERE (surveys.id = questions.survey_id) AND (surveys.user_id = auth.uid())));
CREATE POLICY "Users can update questions from own surveys" ON public.questions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.surveys WHERE (surveys.id = questions.survey_id) AND (surveys.user_id = auth.uid())));
CREATE POLICY "Users can delete questions from own surveys" ON public.questions FOR DELETE USING (EXISTS (SELECT 1 FROM public.surveys WHERE (surveys.id = questions.survey_id) AND (surveys.user_id = auth.uid())));
CREATE POLICY "Anyone can view questions from active surveys" ON public.questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.surveys WHERE (surveys.id = questions.survey_id) AND (surveys.status = 'active'::text) AND (surveys.unique_link IS NOT NULL)));

-- RLS Policies para responses
CREATE POLICY "Users can view responses from own surveys" ON public.responses FOR SELECT USING (EXISTS (SELECT 1 FROM public.surveys WHERE (surveys.id = responses.survey_id) AND (surveys.user_id = auth.uid())));
CREATE POLICY "Anyone can insert responses" ON public.responses FOR INSERT WITH CHECK (true);

-- RLS Policies para question_responses
CREATE POLICY "Users can view responses to their questions" ON public.question_responses FOR SELECT USING (question_id IN (SELECT q.id FROM public.questions q JOIN public.surveys s ON (q.survey_id = s.id) WHERE s.user_id = auth.uid()));
CREATE POLICY "Anyone can insert question responses" ON public.question_responses FOR INSERT WITH CHECK (true);

-- Criar trigger para criar company quando novo usuário se registra (opcional)
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_company();