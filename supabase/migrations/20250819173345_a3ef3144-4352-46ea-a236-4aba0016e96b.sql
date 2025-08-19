-- CORREÇÃO DOS AVISOS DE SEGURANÇA DETECTADOS PELO LINTER

-- 1. Corrigir search_path das funções para segurança
CREATE OR REPLACE FUNCTION public.audit_data_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Log tentativas de acesso a dados que não pertencem ao usuário
    IF OLD.user_id != auth.uid() OR NEW.user_id != auth.uid() THEN
        INSERT INTO public.audit_log (
            event_type,
            table_name,
            record_id,
            user_id,
            details,
            created_at
        ) VALUES (
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            auth.uid(),
            jsonb_build_object(
                'old_user_id', OLD.user_id,
                'new_user_id', NEW.user_id,
                'current_auth_uid', auth.uid()
            ),
            now()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.test_user_data_isolation(_user_id UUID)
RETURNS TABLE (
    test_name TEXT,
    result BOOLEAN,
    details TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Teste 1: Verificar se usuário só vê suas próprias pesquisas
    RETURN QUERY
    SELECT 
        'survey_isolation'::TEXT,
        COUNT(*) = 0,
        FORMAT('Found %s surveys from other users', COUNT(*))
    FROM public.surveys 
    WHERE user_id != _user_id;
    
    -- Teste 2: Verificar se as políticas RLS estão ativas
    RETURN QUERY
    SELECT 
        'rls_enabled'::TEXT,
        pg_table_is_visible('public.surveys'::regclass) AND 
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'surveys') > 0,
        'RLS policies check'::TEXT;
        
END;
$$;

-- 2. Atualizar outras funções existentes para incluir search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.companies (user_id, company_name)
  VALUES (NEW.id, 'Minha Empresa');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_survey_limits()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Definir limite baseado no plano (CORRETO conforme especificação)
  CASE user_plan
    WHEN 'start-quantico' THEN max_surveys := 2;   -- 2 pesquisas por mês
    WHEN 'vortex-neural' THEN max_surveys := 4;    -- 4 pesquisas por mês
    WHEN 'nexus-infinito' THEN max_surveys := 15;  -- 15 pesquisas por mês
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
$$;

CREATE OR REPLACE FUNCTION public.validate_question_limits()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    WHEN 'start-quantico' THEN max_questions := 5;   -- 5 questões
    WHEN 'vortex-neural' THEN max_questions := 10;   -- 10 questões
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
$$;

CREATE OR REPLACE FUNCTION public.validate_response_limits()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT plan_name FROM public.profiles WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_survey_owner(_survey_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = _survey_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_receive_responses(_survey_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = _survey_id 
      AND status = 'active' 
      AND unique_link IS NOT NULL
      AND current_responses < max_responses
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_survey_link(_survey_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  unique_link text;
BEGIN
  -- Gerar um link único baseado em timestamp e UUID
  unique_link := encode(gen_random_bytes(16), 'hex');
  
  -- Atualizar a pesquisa com o link único
  UPDATE public.surveys 
  SET unique_link = unique_link 
  WHERE id = _survey_id;
  
  RETURN unique_link;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_checkout_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.checkout_sessions 
  WHERE expires_at < now() AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.anonymize_respondent_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Garantir que respondent_id seja único mas não identificável
  IF NEW.respondent_id IS NULL THEN
    NEW.respondent_id = gen_random_uuid();
  END IF;
  
  RETURN NEW;
END;
$$;