-- Correção dos limites do plano Start Quântico
-- Atualizar de 5 para 3 questões conforme especificação

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
  
  -- Definir limite baseado no plano (CORRIGIDO: Start Quântico = 3 questões)
  CASE user_plan
    WHEN 'start-quantico' THEN max_questions := 3;  -- Corrigido de 5 para 3
    WHEN 'vortex-neural' THEN max_questions := 10;
    WHEN 'nexus-infinito' THEN max_questions := NULL; -- sem limite
    ELSE max_questions := 3;  -- Padrão também corrigido para 3
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

-- Comentário: Função atualizada com limite correto de 3 questões para Start Quântico