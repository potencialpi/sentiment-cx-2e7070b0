-- Corrigir função com search_path seguro
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
  
  -- Definir limite baseado no plano (CORRIGIDO: limites consistentes com planConfigs.ts)
  CASE user_plan
    WHEN 'start-quantico' THEN max_questions := 3;
    WHEN 'vortex-neural' THEN max_questions := 15;  -- Corrigido de 10 para 15
    WHEN 'nexus-infinito' THEN max_questions := NULL; -- sem limite
    ELSE max_questions := 3;  -- Padrão
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

-- Criar trigger se não existir
DO $$ 
BEGIN
  -- Verificar se o trigger já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'validate_question_limits_trigger' 
    AND event_object_table = 'questions'
  ) THEN
    -- Criar o trigger
    CREATE TRIGGER validate_question_limits_trigger
      BEFORE INSERT ON public.questions
      FOR EACH ROW EXECUTE FUNCTION public.validate_question_limits();
  END IF;
END $$;