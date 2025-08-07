-- Melhorar o isolamento de dados com RLS mais rigoroso

-- 1. Criar função de segurança para verificar plano do usuário
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT plan_name FROM public.profiles WHERE user_id = _user_id;
$$;

-- 2. Criar função para verificar se usuário é o proprietário
CREATE OR REPLACE FUNCTION public.is_survey_owner(_survey_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = _survey_id AND user_id = _user_id
  );
$$;

-- 3. Adicionar índices para melhor performance com RLS
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON public.surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_survey_id ON public.questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON public.responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_question_id ON public.question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_response_id ON public.question_responses(response_id);

-- 4. Recriar políticas RLS mais rigorosas para profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Melhorar políticas RLS para surveys
DROP POLICY IF EXISTS "Users can view their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can create their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can update their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can delete their own surveys" ON public.surveys;

CREATE POLICY "Users can view their own surveys" 
ON public.surveys 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own surveys" 
ON public.surveys 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own surveys" 
ON public.surveys 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own surveys" 
ON public.surveys 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- 6. Melhorar políticas RLS para questions
DROP POLICY IF EXISTS "Users can view questions from their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can create questions for their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can update questions from their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can delete questions from their surveys" ON public.questions;

CREATE POLICY "Users can view questions from their surveys" 
ON public.questions 
FOR SELECT 
TO authenticated
USING (
  survey_id IN (
    SELECT id FROM public.surveys WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create questions for their surveys" 
ON public.questions 
FOR INSERT 
TO authenticated
WITH CHECK (
  survey_id IN (
    SELECT id FROM public.surveys WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update questions from their surveys" 
ON public.questions 
FOR UPDATE 
TO authenticated
USING (
  survey_id IN (
    SELECT id FROM public.surveys WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  survey_id IN (
    SELECT id FROM public.surveys WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete questions from their surveys" 
ON public.questions 
FOR DELETE 
TO authenticated
USING (
  survey_id IN (
    SELECT id FROM public.surveys WHERE user_id = auth.uid()
  )
);

-- 7. Melhorar políticas RLS para responses
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
DROP POLICY IF EXISTS "Users can view responses to their surveys" ON public.responses;

CREATE POLICY "Anyone can insert responses" 
ON public.responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view responses to their surveys" 
ON public.responses 
FOR SELECT 
TO authenticated
USING (
  survey_id IN (
    SELECT id FROM public.surveys WHERE user_id = auth.uid()
  )
);

-- 8. Melhorar políticas RLS para question_responses
DROP POLICY IF EXISTS "Anyone can insert question responses" ON public.question_responses;
DROP POLICY IF EXISTS "Users can view responses to their questions" ON public.question_responses;

CREATE POLICY "Anyone can insert question responses" 
ON public.question_responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view responses to their questions" 
ON public.question_responses 
FOR SELECT 
TO authenticated
USING (
  question_id IN (
    SELECT q.id FROM public.questions q
    JOIN public.surveys s ON q.survey_id = s.id
    WHERE s.user_id = auth.uid()
  )
);

-- 9. Criar trigger para validar limites por plano
CREATE OR REPLACE FUNCTION public.validate_survey_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_plan text;
  survey_count integer;
  max_surveys integer;
BEGIN
  -- Obter plano do usuário
  SELECT plan_name INTO user_plan 
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Definir limite baseado no plano
  CASE user_plan
    WHEN 'start-quantico' THEN max_surveys := 2;
    WHEN 'vortex-neural' THEN max_surveys := 4;
    WHEN 'nexus-infinito' THEN max_surveys := 15;
    ELSE max_surveys := 2;
  END CASE;
  
  -- Contar pesquisas do mês atual
  SELECT COUNT(*) INTO survey_count
  FROM public.surveys
  WHERE user_id = NEW.user_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';
  
  -- Validar limite
  IF survey_count >= max_surveys THEN
    RAISE EXCEPTION 'Limite de pesquisas por mês excedido para o plano %: % pesquisas', user_plan, max_surveys;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger para surveys
DROP TRIGGER IF EXISTS validate_survey_limits_trigger ON public.surveys;
CREATE TRIGGER validate_survey_limits_trigger
  BEFORE INSERT ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_survey_limits();

-- 10. Criar trigger para validar limites de questões por plano
CREATE OR REPLACE FUNCTION public.validate_question_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_plan text;
  question_count integer;
  max_questions integer;
  survey_user_id uuid;
BEGIN
  -- Obter user_id da survey
  SELECT user_id INTO survey_user_id
  FROM public.surveys
  WHERE id = NEW.survey_id;
  
  -- Obter plano do usuário
  SELECT plan_name INTO user_plan 
  FROM public.profiles 
  WHERE user_id = survey_user_id;
  
  -- Definir limite baseado no plano
  CASE user_plan
    WHEN 'start-quantico' THEN max_questions := 5;
    WHEN 'vortex-neural' THEN max_questions := 10;
    WHEN 'nexus-infinito' THEN max_questions := NULL; -- sem limite
    ELSE max_questions := 5;
  END CASE;
  
  -- Verificar limite apenas se houver um definido
  IF max_questions IS NOT NULL THEN
    -- Contar questões da pesquisa
    SELECT COUNT(*) INTO question_count
    FROM public.questions
    WHERE survey_id = NEW.survey_id;
    
    -- Validar limite
    IF question_count >= max_questions THEN
      RAISE EXCEPTION 'Limite de questões por pesquisa excedido para o plano %: % questões', user_plan, max_questions;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger para questions
DROP TRIGGER IF EXISTS validate_question_limits_trigger ON public.questions;
CREATE TRIGGER validate_question_limits_trigger
  BEFORE INSERT ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_question_limits();

-- 11. Criar função para anonimizar dados conforme LGPD
CREATE OR REPLACE FUNCTION public.anonymize_respondent_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Garantir que respondent_id seja único mas não identificável
  IF NEW.respondent_id IS NULL THEN
    NEW.respondent_id := gen_random_uuid();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger para anonimização
DROP TRIGGER IF EXISTS anonymize_respondent_trigger ON public.responses;
CREATE TRIGGER anonymize_respondent_trigger
  BEFORE INSERT ON public.responses
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymize_respondent_data();