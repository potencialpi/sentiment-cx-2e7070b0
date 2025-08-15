-- Verificar e recriar triggers para criação automática de perfis e empresas

-- Primeiro, vamos verificar se as funções existem
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, plan_name, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'plan_name', 'start-quantico'),
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user_company()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.companies (user_id, company_name, plan_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Empresa Padrão'),
    COALESCE(NEW.raw_user_meta_data->>'plan_name', 'start-quantico')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover triggers existentes se houver
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;

-- Criar os triggers
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

CREATE TRIGGER on_auth_user_created_company
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_company();

-- Garantir permissões para as tabelas
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.companies TO anon, authenticated;

-- Verificar se os triggers foram criados
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users'
AND trigger_name IN ('on_auth_user_created_profile', 'on_auth_user_created_company');