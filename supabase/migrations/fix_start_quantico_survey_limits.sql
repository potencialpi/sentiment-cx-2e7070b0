-- Corrigir limites do Start Quântico para 3 pesquisas por mês conforme documentação
-- Data: 2025-01-22

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
  
  -- Definir limite baseado no plano
  CASE user_plan
    WHEN 'start-quantico' THEN max_surveys := 3;    -- CORRIGIDO: 3 pesquisas por mês
    WHEN 'vortex-neural' THEN max_surveys := 4;     -- 4 pesquisas por mês
    WHEN 'nexus-infinito' THEN max_surveys := NULL; -- sem limite (ilimitadas)
    ELSE max_surveys := 3;  -- Padrão Start Quântico corrigido
  END CASE;
  
  -- Verificar limite apenas se houver um definido
  IF max_surveys IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar o trigger para garantir que use a função atualizada
DROP TRIGGER IF EXISTS validate_survey_limits_trigger ON surveys;
CREATE TRIGGER validate_survey_limits_trigger
    BEFORE INSERT ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION validate_survey_limits();

-- Comentário para documentar a mudança
COMMENT ON FUNCTION public.validate_survey_limits() IS 'Valida limites de pesquisas por mês: Start Quântico (3), Vortex Neural (4), Nexus Infinito (ilimitado)';