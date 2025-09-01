-- Correções de segurança para funções de banco de dados
-- Adicionar SET search_path = 'public' às funções que não possuem essa configuração

-- 1. Corrigir função handle_new_user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Tentar inserir o perfil
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    
    -- Log de sucesso
    RAISE NOTICE 'Perfil criado com sucesso para usuário: %', NEW.email;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Perfil já existe, apenas atualizar
      UPDATE public.profiles 
      SET 
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', email),
        updated_at = NOW()
      WHERE id = NEW.id;
      
      RAISE NOTICE 'Perfil atualizado para usuário: %', NEW.email;
      
    WHEN OTHERS THEN
      -- Log do erro mas não falha o signup
      RAISE WARNING 'Erro ao criar/atualizar perfil para %: % - %', NEW.email, SQLSTATE, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public';

-- 2. Verificar e corrigir validate_survey_limits se necessário
-- (Esta função já tem search_path configurado em migrações mais recentes)

-- 3. Verificar e corrigir validate_question_limits se necessário  
-- (Esta função já tem search_path configurado em migrações mais recentes)

-- 4. Verificar e corrigir validate_response_limits se necessário
-- (Esta função já tem search_path configurado em migrações mais recentes)

-- 5. A função validate_magic_link_secure já tem search_path = public configurado

-- Comentários de documentação
COMMENT ON FUNCTION public.handle_new_user_profile() IS 'Cria automaticamente um perfil quando um novo usuário é registrado via Auth - com search_path seguro';

-- Log da aplicação desta migração de segurança
INSERT INTO public.audit_log (
    event_type,
    table_name,
    details,
    created_at
) VALUES (
    'SECURITY_MIGRATION',
    'database_functions',
    jsonb_build_object(
        'migration', 'security_fix_database_functions',
        'changes', ARRAY[
            'Added search_path to handle_new_user_profile function',
            'Verified other functions already have secure search_path'
        ]
    ),
    now()
);