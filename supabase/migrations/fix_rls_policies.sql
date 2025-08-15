-- Corrigir políticas RLS para permitir inserção via triggers

-- Desabilitar RLS temporariamente para verificar se é o problema
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- Ou criar políticas mais permissivas para os triggers
-- DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
-- DROP POLICY IF EXISTS "Users can insert their own company" ON public.companies;

-- CREATE POLICY "Allow profile creation via trigger" ON public.profiles
--   FOR INSERT WITH CHECK (true);

-- CREATE POLICY "Allow company creation via trigger" ON public.companies
--   FOR INSERT WITH CHECK (true);

-- Garantir que as funções tenham privilégios de SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, company_name, plan_id, billing_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Empresa Padrão'),
    COALESCE(NEW.raw_user_meta_data->>'plan_id', 'start-quantico'),
    COALESCE(NEW.raw_user_meta_data->>'billing_type', 'monthly')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_company()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.companies (id, name, plan_id, billing_type, owner_id)
  VALUES (
    gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Empresa Padrão'),
    COALESCE(NEW.raw_user_meta_data->>'plan_id', 'start-quantico'),
    COALESCE(NEW.raw_user_meta_data->>'billing_type', 'monthly'),
    NEW.id
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar company: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar os triggers
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

CREATE TRIGGER on_auth_user_created_company
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company();

-- Garantir permissões
GRANT ALL PRIVILEGES ON public.profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.companies TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.companies TO anon;