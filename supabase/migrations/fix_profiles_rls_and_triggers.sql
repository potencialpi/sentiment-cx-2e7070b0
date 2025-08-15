-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Conceder permissões básicas para anon e authenticated
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon;
GRANT ALL PRIVILEGES ON public.profiles TO authenticated;

-- Criar políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Verificar e recriar função handle_new_user_profile se necessário
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user_profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Verificar e recriar função handle_new_user_company se necessário
CREATE OR REPLACE FUNCTION public.handle_new_user_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.companies (id, name, plan_id, billing_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'),
    COALESCE(NEW.raw_user_meta_data->>'plan_id', 'start-quantico'),
    COALESCE(NEW.raw_user_meta_data->>'billing_type', 'monthly')
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user_company: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Remover triggers existentes se houver
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;

-- Recriar triggers
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

CREATE TRIGGER on_auth_user_created_company
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company();

-- Verificar permissões nas tabelas companies
GRANT SELECT, INSERT, UPDATE ON public.companies TO anon;
GRANT ALL PRIVILEGES ON public.companies TO authenticated;