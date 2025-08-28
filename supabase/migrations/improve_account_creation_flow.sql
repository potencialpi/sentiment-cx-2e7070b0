-- =====================================================
-- MELHORIA DO FLUXO DE CRIAÇÃO DE CONTAS E PERFIS
-- =====================================================
-- Este arquivo corrige e melhora a integração entre criação de contas,
-- perfis de usuário e dados de empresa para garantir consistência

-- 1. CORRIGIR FUNÇÃO DE CRIAÇÃO DE PERFIL
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log para debugging
  RAISE LOG 'Creating profile for user: %', NEW.id;
  
  -- Inserir perfil na tabela profiles com dados completos
  INSERT INTO public.profiles (
    user_id, 
    email,
    plan_name,
    status,
    subscription_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'plan_name', 'start-quantico'),
    'active',
    'inactive'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
    
  -- Criar empresa associada se não existir
  INSERT INTO public.companies (
    user_id,
    company_name,
    plan_name
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'Minha Empresa'),
    COALESCE(NEW.raw_user_meta_data ->> 'plan_name', 'start-quantico')
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE LOG 'Profile and company created successfully for user: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    -- Não falhar o processo de criação do usuário
    RETURN NEW;
END;
$$;

-- 2. RECRIAR TRIGGER COM MELHOR CONFIGURAÇÃO
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_profile();

-- 3. FUNÇÃO PARA SINCRONIZAR DADOS DE PERFIL
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_profile_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Criar perfis para usuários que não têm
  INSERT INTO public.profiles (user_id, email, plan_name, status, subscription_status)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data ->> 'plan_name', 'start-quantico'),
    'active',
    'inactive'
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE p.user_id IS NULL;
  
  -- Criar empresas para usuários que não têm
  INSERT INTO public.companies (user_id, company_name, plan_name)
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data ->> 'company_name', 'Minha Empresa'),
    COALESCE(au.raw_user_meta_data ->> 'plan_name', 'start-quantico')
  FROM auth.users au
  LEFT JOIN public.companies c ON au.id = c.user_id
  WHERE c.user_id IS NULL;
  
  -- Atualizar emails em perfis que estão desatualizados
  UPDATE public.profiles p
  SET 
    email = au.email,
    updated_at = now()
  FROM auth.users au
  WHERE p.user_id = au.id 
    AND (p.email IS NULL OR p.email != au.email);
    
  -- Corrigir planos NULL
  UPDATE public.profiles 
  SET plan_name = 'start-quantico' 
  WHERE plan_name IS NULL;
  
  UPDATE public.companies 
  SET plan_name = 'start-quantico' 
  WHERE plan_name IS NULL;
  
  RAISE NOTICE 'Profile data synchronization completed';
END;
$$;

-- 4. EXECUTAR SINCRONIZAÇÃO INICIAL
-- =====================================================
SELECT public.sync_profile_data();

-- 5. FUNÇÃO PARA VALIDAR INTEGRIDADE DOS DADOS
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_account_integrity()
RETURNS TABLE(
  check_name text,
  status text,
  details text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar usuários sem perfil
  RETURN QUERY
  SELECT 
    'users_without_profile'::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUE' END::text,
    'Users without profile: ' || COUNT(*)::text
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE p.user_id IS NULL;
  
  -- Verificar usuários sem empresa
  RETURN QUERY
  SELECT 
    'users_without_company'::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUE' END::text,
    'Users without company: ' || COUNT(*)::text
  FROM auth.users au
  LEFT JOIN public.companies c ON au.id = c.user_id
  WHERE c.user_id IS NULL;
  
  -- Verificar perfis com email desatualizado
  RETURN QUERY
  SELECT 
    'profiles_email_mismatch'::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUE' END::text,
    'Profiles with email mismatch: ' || COUNT(*)::text
  FROM public.profiles p
  JOIN auth.users au ON p.user_id = au.id
  WHERE p.email != au.email OR p.email IS NULL;
  
  -- Verificar planos NULL
  RETURN QUERY
  SELECT 
    'null_plans'::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUE' END::text,
    'Records with NULL plans: ' || COUNT(*)::text
  FROM (
    SELECT plan_name FROM public.profiles WHERE plan_name IS NULL
    UNION ALL
    SELECT plan_name FROM public.companies WHERE plan_name IS NULL
  ) t;
END;
$$;

-- 6. MELHORAR POLÍTICAS RLS PARA PERFIS
-- =====================================================
-- Garantir que as políticas estão otimizadas
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 7. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);

-- 8. EXECUTAR VALIDAÇÃO FINAL
-- =====================================================
SELECT * FROM public.validate_account_integrity();

-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON FUNCTION public.handle_new_user_profile() IS 'Trigger function to automatically create profile and company records when a new user is created';
COMMENT ON FUNCTION public.sync_profile_data() IS 'Function to synchronize profile data and fix inconsistencies';
COMMENT ON FUNCTION public.validate_account_integrity() IS 'Function to validate data integrity between auth.users, profiles, and companies tables';

-- Log de conclusão
-- Account creation flow improvements completed successfully