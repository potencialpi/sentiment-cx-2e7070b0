-- Corrigir todas as funções de validação conforme especificação dos planos

-- 1. Corrigir validate_question_limits com limites corretos
CREATE OR REPLACE FUNCTION public.validate_question_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Definir limite baseado no plano (CORRETO conforme especificação)
  CASE user_plan
    WHEN 'start-quantico' THEN max_questions := 5;  -- Corrigido: 5 questões
    WHEN 'vortex-neural' THEN max_questions := 10;  -- Corrigido: 10 questões
    WHEN 'nexus-infinito' THEN max_questions := NULL; -- sem limite
    ELSE max_questions := 5;  -- Padrão Start Quântico
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
$function$;

-- 2. Corrigir validate_survey_limits com limites corretos
CREATE OR REPLACE FUNCTION public.validate_survey_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_plan text;
  survey_count integer;
  max_surveys integer;
BEGIN
  -- Obter plano do usuário
  SELECT plan_name INTO user_plan 
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Definir limite baseado no plano (CORRETO conforme especificação)
  CASE user_plan
    WHEN 'start-quantico' THEN max_surveys := 2;   -- Corrigido: 2 pesquisas por mês
    WHEN 'vortex-neural' THEN max_surveys := 4;    -- Corrigido: 4 pesquisas por mês
    WHEN 'nexus-infinito' THEN max_surveys := 15;  -- Corrigido: 15 pesquisas por mês
    ELSE max_surveys := 2;  -- Padrão Start Quântico
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
$function$;

-- 3. Criar nova função validate_response_limits
CREATE OR REPLACE FUNCTION public.validate_response_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_plan text;
  current_responses integer;
  max_responses integer;
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
    WHEN 'start-quantico' THEN max_responses := 100;  -- 100 respostas por pesquisa
    WHEN 'vortex-neural' THEN max_responses := 250;   -- 250 respostas por pesquisa
    WHEN 'nexus-infinito' THEN max_responses := NULL; -- sem limite
    ELSE max_responses := 100;  -- Padrão Start Quântico
  END CASE;
  
  -- Verificar limite apenas se houver um definido
  IF max_responses IS NOT NULL THEN
    -- Contar respostas da pesquisa
    SELECT COUNT(*) INTO current_responses
    FROM public.responses
    WHERE survey_id = NEW.survey_id;
    
    -- Validar limite
    IF current_responses >= max_responses THEN
      RAISE EXCEPTION 'Limite de respostas por pesquisa excedido para o plano %: % respostas', user_plan, max_responses;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar triggers para as validações
DO $$ 
BEGIN
  -- Trigger para validar limites de questões
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'validate_question_limits_trigger' 
    AND event_object_table = 'questions'
  ) THEN
    CREATE TRIGGER validate_question_limits_trigger
      BEFORE INSERT ON public.questions
      FOR EACH ROW EXECUTE FUNCTION public.validate_question_limits();
  END IF;

  -- Trigger para validar limites de pesquisas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'validate_survey_limits_trigger' 
    AND event_object_table = 'surveys'
  ) THEN
    CREATE TRIGGER validate_survey_limits_trigger
      BEFORE INSERT ON public.surveys
      FOR EACH ROW EXECUTE FUNCTION public.validate_survey_limits();
  END IF;

  -- Trigger para validar limites de respostas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'validate_response_limits_trigger' 
    AND event_object_table = 'responses'
  ) THEN
    CREATE TRIGGER validate_response_limits_trigger
      BEFORE INSERT ON public.responses
      FOR EACH ROW EXECUTE FUNCTION public.validate_response_limits();
  END IF;
END $$;