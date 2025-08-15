-- CORREÇÃO COMPLETA DOS PROBLEMAS DE AUTH
-- Este arquivo corrige todos os problemas identificados:
-- ❌ Auth básico falha mesmo usando service_role_key
-- ❌ SignUp simples falha sem metadados
-- ❌ SignUp com metadados falha
-- ❌ Funções de trigger não podem ser verificadas

-- 1. GARANTIR QUE AS TABELAS EXISTEM COM ESTRUTURA CORRETA
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. HABILITAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3. REMOVER POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update own company" ON public.companies;
DROP POLICY IF EXISTS "Users can insert own company" ON public.companies;
DROP POLICY IF EXISTS "Users can delete own company" ON public.companies;

-- 4. CRIAR POLÍTICAS RLS OTIMIZADAS
-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Políticas para companies
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update own company" ON public.companies
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own company" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own company" ON public.companies
  FOR DELETE USING (auth.uid() = owner_id);

-- 5. REMOVER TRIGGERS E FUNÇÕES EXISTENTES
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();
DROP FUNCTION IF EXISTS public.handle_new_user_company();

-- 6. CRIAR FUNÇÃO ROBUSTA PARA CRIAR PERFIL
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CRIAR FUNÇÃO ROBUSTA PARA CRIAR EMPRESA
CREATE OR REPLACE FUNCTION public.handle_new_user_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se há dados de empresa nos metadados
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'company_name' IS NOT NULL THEN
    BEGIN
      INSERT INTO public.companies (name, owner_id)
      VALUES (
        NEW.raw_user_meta_data->>'company_name',
        NEW.id
      );
      
      -- Log de sucesso
      RAISE NOTICE 'Empresa criada com sucesso: % para usuário: %', 
        NEW.raw_user_meta_data->>'company_name', NEW.email;
        
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro mas não falha o signup
        RAISE WARNING 'Erro ao criar empresa para %: % - %', NEW.email, SQLSTATE, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CRIAR TRIGGERS COM TRATAMENTO DE ERRO
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

CREATE TRIGGER on_auth_user_created_company
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company();

-- 9. GARANTIR PERMISSÕES CORRETAS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.companies TO anon, authenticated;

-- 10. VERIFICAR SE AS FUNÇÕES FORAM CRIADAS
DO $$
BEGIN
  -- Verificar função de perfil
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user_profile') THEN
    RAISE NOTICE '✅ Função handle_new_user_profile criada com sucesso';
  ELSE
    RAISE WARNING '❌ Função handle_new_user_profile não foi criada';
  END IF;
  
  -- Verificar função de empresa
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user_company') THEN
    RAISE NOTICE '✅ Função handle_new_user_company criada com sucesso';
  ELSE
    RAISE WARNING '❌ Função handle_new_user_company não foi criada';
  END IF;
  
  -- Verificar triggers
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_profile') THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created_profile criado com sucesso';
  ELSE
    RAISE WARNING '❌ Trigger on_auth_user_created_profile não foi criado';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_company') THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created_company criado com sucesso';
  ELSE
    RAISE WARNING '❌ Trigger on_auth_user_created_company não foi criado';
  END IF;
END $$;

-- 11. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON FUNCTION public.handle_new_user_profile() IS 'Cria automaticamente um perfil quando um novo usuário é registrado via Auth';
COMMENT ON FUNCTION public.handle_new_user_company() IS 'Cria automaticamente uma empresa quando um novo usuário é registrado com company_name nos metadados';
COMMENT ON TRIGGER on_auth_user_created_profile ON auth.users IS 'Trigger que executa handle_new_user_profile após inserção de usuário';
COMMENT ON TRIGGER on_auth_user_created_company ON auth.users IS 'Trigger que executa handle_new_user_company após inserção de usuário';