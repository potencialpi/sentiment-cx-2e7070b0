-- Corrigir problemas de segurança detectados pelo linter

-- 1. Corrigir a função cleanup_expired_checkout_sessions com search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_checkout_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.checkout_sessions 
  WHERE expires_at < now() AND status = 'pending';
END;
$$;

-- 2. Corrigir a função handle_new_user com search_path
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