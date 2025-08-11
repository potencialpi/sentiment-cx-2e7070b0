-- Criar função para criar perfil automaticamente quando um usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Inserir perfil na tabela profiles
  INSERT INTO public.profiles (user_id, plan_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'plan_name', 'start-quantico')
  );
  RETURN NEW;
END;
$$;

-- Criar trigger que executa após criar usuário
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Verificar se existem usuários sem perfil e criar perfis para eles
INSERT INTO public.profiles (user_id, plan_name)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'plan_name', 'start-quantico') as plan_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Verificar se existem usuários sem company e criar companies para eles
INSERT INTO public.companies (user_id, company_name, plan_name)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'company_name', 'Empresa') as company_name,
  COALESCE(au.raw_user_meta_data ->> 'plan_name', 'start-quantico') as plan_name
FROM auth.users au
LEFT JOIN public.companies c ON au.id = c.user_id
WHERE c.user_id IS NULL;

-- Atualizar planos NULL para 'start-quantico' na tabela profiles
UPDATE public.profiles 
SET plan_name = 'start-quantico' 
WHERE plan_name IS NULL;

-- Atualizar planos NULL para 'start-quantico' na tabela companies
UPDATE public.companies 
SET plan_name = 'start-quantico' 
WHERE plan_name IS NULL;

-- Verificar contagens após correção
SELECT 
  'auth.users' as tabela,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
  'public.profiles' as tabela,
  COUNT(*) as total
FROM public.profiles
UNION ALL
SELECT 
  'public.companies' as tabela,
  COUNT(*) as total
FROM public.companies;