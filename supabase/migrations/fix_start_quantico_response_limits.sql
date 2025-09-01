-- Corrigir limites do Start Quântico para 50 respostas conforme documentação
-- Data: 2025-01-22

CREATE OR REPLACE FUNCTION public.validate_response_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER  -- Permite contornar políticas RLS
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
    WHEN 'start-quantico' THEN max_responses := 50;   -- CORRIGIDO: 50 respostas por pesquisa
    WHEN 'vortex-neural' THEN max_responses := 250;   -- 250 respostas por pesquisa
    WHEN 'nexus-infinito' THEN max_responses := NULL; -- sem limite
    ELSE max_responses := 50;  -- Padrão Start Quântico corrigido
  END CASE;
  
  -- Verificar limite apenas se houver um definido
  IF max_responses IS NOT NULL THEN
    -- Contar respostas da pesquisa usando SECURITY DEFINER
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

-- Recriar o trigger para garantir que use a função atualizada
DROP TRIGGER IF EXISTS validate_response_limits_trigger ON responses;
CREATE TRIGGER validate_response_limits_trigger
    BEFORE INSERT ON responses
    FOR EACH ROW
    EXECUTE FUNCTION validate_response_limits();

-- Comentário para documentar a mudança
COMMENT ON FUNCTION public.validate_response_limits() IS 'Valida limites de respostas por pesquisa: Start Quântico (50), Vortex Neural (250), Nexus Infinito (ilimitado)';