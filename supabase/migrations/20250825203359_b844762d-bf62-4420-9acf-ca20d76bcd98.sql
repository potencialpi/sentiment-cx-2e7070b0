-- Corrigir políticas RLS para tabela responses
-- Remover política problemática atual
DROP POLICY IF EXISTS "public_insert_responses" ON public.responses;

-- Criar nova política específica para inserções anônimas
-- Esta política permite tanto usuários autenticados quanto anônimos
CREATE POLICY "allow_anonymous_insert_responses" 
ON public.responses 
FOR INSERT 
WITH CHECK (
  -- Permite inserção se a survey está ativa e aceita respostas
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = survey_id 
    AND status = 'active' 
    AND unique_link IS NOT NULL 
    AND current_responses < max_responses
  )
);

-- Política adicional específica para role anon do Supabase
CREATE POLICY "anon_role_insert_responses" 
ON public.responses 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Política adicional para usuários autenticados (redundância de segurança)
CREATE POLICY "authenticated_insert_responses" 
ON public.responses 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = survey_id 
    AND status = 'active' 
    AND unique_link IS NOT NULL 
    AND current_responses < max_responses
  )
);

-- Remover políticas temporárias de acesso amplo identificadas pelo scanner
DROP POLICY IF EXISTS "Acesso temporário profiles" ON public.profiles;
DROP POLICY IF EXISTS "Acesso temporário companies" ON public.companies;

-- Recriar políticas específicas para profiles (manter funcionalidade necessária)
CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Recriar políticas específicas para companies
CREATE POLICY "companies_select_own" 
ON public.companies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "companies_insert_own" 
ON public.companies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "companies_update_own" 
ON public.companies 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);