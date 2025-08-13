-- Fix security issues by updating functions to have proper search_path settings
-- This addresses the "Function Search Path Mutable" warnings

-- Update handle_new_user_company function
CREATE OR REPLACE FUNCTION public.handle_new_user_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar registro na tabela companies com dados do metadata
  INSERT INTO public.companies (user_id, company_name, plan_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'Empresa'), 
    COALESCE(NEW.raw_user_meta_data ->> 'plan_name', 'start-quantico')
  );
  RETURN NEW;
END;
$function$;

-- Update handle_new_user_profile function  
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Inserir perfil na tabela profiles
  INSERT INTO public.profiles (user_id, plan_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'plan_name', 'start-quantico')
  );
  RETURN NEW;
END;
$function$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.companies (user_id, name)
  VALUES (NEW.id, 'Minha Empresa');
  RETURN NEW;
END;
$function$;