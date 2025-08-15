-- DESABILITAR TRIGGERS TEMPORARIAMENTE
-- Este script remove os triggers que estão causando o erro "Database error saving new user"
-- Permitindo que a aplicação funcione enquanto o problema é resolvido no painel Supabase

-- 1. Remover triggers completamente
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;

-- 2. Remover as funções de trigger também
DROP FUNCTION IF EXISTS public.handle_new_user_profile();
DROP FUNCTION IF EXISTS public.handle_new_user_company();

-- 3. Garantir que as tabelas tenham permissões adequadas
GRANT ALL PRIVILEGES ON public.profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.companies TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.companies TO anon;

-- 4. Garantir RLS habilitado mas com políticas permissivas temporárias
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Remover políticas restritivas
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver própria empresa" ON public.companies;
DROP POLICY IF EXISTS "Usuários podem atualizar própria empresa" ON public.companies;

-- Criar políticas temporárias mais permissivas
CREATE POLICY "Acesso temporário profiles" ON public.profiles
  FOR ALL USING (true);

CREATE POLICY "Acesso temporário companies" ON public.companies
  FOR ALL USING (true);

-- NOTA: Com os triggers removidos, será necessário criar profiles e companies manualmente
-- ou implementar a lógica no frontend/backend da aplicação