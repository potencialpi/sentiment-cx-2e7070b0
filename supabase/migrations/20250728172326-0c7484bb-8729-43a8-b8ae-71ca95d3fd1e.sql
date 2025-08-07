-- Corrigir avisos de segurança - search_path nas funções

-- 1. Corrigir função get_user_plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT plan_name FROM public.profiles WHERE user_id = _user_id;
$$;

-- 2. Corrigir função is_survey_owner
CREATE OR REPLACE FUNCTION public.is_survey_owner(_survey_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = _survey_id AND user_id = _user_id
  );
$$;

-- 3. Corrigir função validate_survey_limits
CREATE OR REPLACE FUNCTION public.validate_survey_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- 4. Corrigir função validate_question_limits
CREATE OR REPLACE FUNCTION public.validate_question_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- 5. Corrigir função anonymize_respondent_data
CREATE OR REPLACE FUNCTION public.anonymize_respondent_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Garantir que respondent_id seja único mas não identificável
  IF NEW.respondent_id IS NULL THEN
    NEW.respondent_id = gen_random_uuid();
  END IF;
  
  RETURN NEW;
END;
$$;