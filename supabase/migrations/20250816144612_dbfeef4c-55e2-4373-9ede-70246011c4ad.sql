-- Corrigir função trigger para usar coluna company_name correta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.companies (user_id, company_name)
  VALUES (NEW.id, 'Minha Empresa');
  RETURN NEW;
END;
$$;