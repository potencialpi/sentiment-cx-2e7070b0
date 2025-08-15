-- CORREÇÃO DEFINITIVA DO AUTH SUPABASE
-- Remove triggers existentes e recria com tratamento robusto de erro

-- 1. Remover triggers existentes
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;

-- 2. Recriar função handle_new_user_profile com tratamento robusto
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    -- Inserir perfil básico
    INSERT INTO public.profiles (
      id,
      email,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      NOW(),
      NOW()
    );
    
    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log do erro mas não falha o trigger
      RAISE WARNING 'Erro ao criar profile para usuário %: %', NEW.id, SQLERRM;
      RETURN NEW;
  END;
END;
$$;

-- 3. Recriar função handle_new_user_company com tratamento robusto
CREATE OR REPLACE FUNCTION public.handle_new_user_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_name_meta text;
  plan_id_meta text;
  billing_type_meta text;
  new_company_id uuid;
BEGIN
  BEGIN
    -- Extrair metadados
    company_name_meta := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');
    plan_id_meta := COALESCE(NEW.raw_user_meta_data->>'plan_id', 'start-quantico');
    billing_type_meta := COALESCE(NEW.raw_user_meta_data->>'billing_type', 'monthly');
    
    -- Criar empresa
    INSERT INTO public.companies (
      id,
      name,
      plan_id,
      billing_type,
      user_id,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      company_name_meta,
      plan_id_meta,
      billing_type_meta,
      NEW.id,
      NOW(),
      NOW()
    ) RETURNING id INTO new_company_id;
    
    -- Atualizar profile com company_id
    UPDATE public.profiles 
    SET 
      company_id = new_company_id,
      updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log do erro mas não falha o trigger
      RAISE WARNING 'Erro ao criar company para usuário %: %', NEW.id, SQLERRM;
      RETURN NEW;
  END;
END;
$$;

-- 4. Recriar triggers
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

CREATE TRIGGER on_auth_user_created_company
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_company();

-- 5. Garantir RLS habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 6. Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver própria empresa" ON public.companies;
DROP POLICY IF EXISTS "Usuários podem atualizar própria empresa" ON public.companies;

-- 7. Criar políticas RLS
CREATE POLICY "Usuários podem ver próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuários podem ver própria empresa" ON public.companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar própria empresa" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);

-- 8. Garantir permissões básicas
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 9. Garantir permissões para anon (necessário para signup)
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.companies TO anon;
GRANT USAGE ON SCHEMA public TO anon;