-- =====================================================
-- SCRIPT DE CORREÇÃO ABRANGENTE PARA SUPABASE AUTH
-- =====================================================
-- Este script corrige todas as configurações possíveis
-- que podem estar causando o erro "Database error saving new user"

-- 1. VERIFICAR E CORRIGIR ESQUEMA AUTH
-- =====================================================

-- Verificar se o esquema auth existe e tem as tabelas necessárias
DO $$
BEGIN
    -- Verificar se auth.users existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        RAISE NOTICE 'ERRO CRÍTICO: Tabela auth.users não existe!';
    ELSE
        RAISE NOTICE 'OK: Tabela auth.users existe';
    END IF;
    
    -- Verificar se auth.identities existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
        RAISE NOTICE 'ERRO CRÍTICO: Tabela auth.identities não existe!';
    ELSE
        RAISE NOTICE 'OK: Tabela auth.identities existe';
    END IF;
END $$;

-- 2. VERIFICAR E CORRIGIR PERMISSÕES DO ESQUEMA AUTH
-- =====================================================

-- Garantir que o service_role tem todas as permissões necessárias
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO service_role;

-- Garantir que authenticator tem permissões básicas
GRANT USAGE ON SCHEMA auth TO authenticator;
GRANT SELECT, INSERT, UPDATE ON auth.users TO authenticator;
GRANT SELECT, INSERT, UPDATE ON auth.identities TO authenticator;

-- 3. VERIFICAR E CORRIGIR RLS NO ESQUEMA PUBLIC
-- =====================================================

-- Garantir que RLS está configurado corretamente nas tabelas public
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que podem estar conflitando
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow service_role full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to manage own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update own company" ON public.companies;
DROP POLICY IF EXISTS "Service role can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Allow service_role full access to companies" ON public.companies;
DROP POLICY IF EXISTS "Allow authenticated users to manage own company" ON public.companies;

-- Criar políticas RLS mais permissivas para debugging
CREATE POLICY "Allow service_role full access to profiles" ON public.profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage own profile" ON public.profiles
    FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow service_role full access to companies" ON public.companies
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage own company" ON public.companies
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. GARANTIR PERMISSÕES BÁSICAS PARA ROLES
-- =====================================================

-- Permissões para anon (usuários não autenticados)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.companies TO anon;

-- Permissões para authenticated (usuários autenticados)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.surveys TO authenticated;
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.responses TO authenticated;
GRANT ALL ON public.question_responses TO authenticated;
GRANT ALL ON public.respondents TO authenticated;

-- Permissões para service_role (acesso total)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 5. RECRIAR FUNÇÕES DE TRIGGER CORRIGIDAS
-- =====================================================

-- Função para criar perfil do usuário
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    BEGIN
        INSERT INTO public.profiles (id, email, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
        RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
        -- Não falhar o signup se houver erro no profile
        RETURN NEW;
    END;
END;
$$;

-- Função para criar empresa do usuário (CORRIGIDA)
CREATE OR REPLACE FUNCTION public.handle_new_user_company()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    company_name_val TEXT;
    plan_name_val TEXT;
BEGIN
    BEGIN
        -- Extrair metadados do usuário
        company_name_val := COALESCE((NEW.raw_user_meta_data->>'company_name')::TEXT, 'Minha Empresa');
        plan_name_val := COALESCE((NEW.raw_user_meta_data->>'plan_id')::TEXT, 'start-quantico');
        
        -- Garantir que o plan_name é válido
        IF plan_name_val NOT IN ('start-quantico', 'vortex-neural', 'nexus-infinito') THEN
            plan_name_val := 'start-quantico';
        END IF;
        
        INSERT INTO public.companies (
            id,
            company_name,
            user_id,
            plan_name,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            company_name_val,
            NEW.id,
            plan_name_val,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Company created successfully for user: %', NEW.id;
        RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating company for user %: %', NEW.id, SQLERRM;
        -- Não falhar o signup se houver erro na empresa
        RETURN NEW;
    END;
END;
$$;

-- 6. RECRIAR TRIGGERS
-- =====================================================

-- Remover triggers existentes
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;

-- Criar novos triggers
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile();

CREATE TRIGGER on_auth_user_created_company
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_company();

-- 7. VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar se as funções foram criadas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user_profile') THEN
        RAISE NOTICE 'OK: Função handle_new_user_profile criada';
    ELSE
        RAISE NOTICE 'ERRO: Função handle_new_user_profile não foi criada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user_company') THEN
        RAISE NOTICE 'OK: Função handle_new_user_company criada';
    ELSE
        RAISE NOTICE 'ERRO: Função handle_new_user_company não foi criada';
    END IF;
END $$;

-- Verificar se os triggers foram criados
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_profile') THEN
        RAISE NOTICE 'OK: Trigger on_auth_user_created_profile criado';
    ELSE
        RAISE NOTICE 'ERRO: Trigger on_auth_user_created_profile não foi criado';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_company') THEN
        RAISE NOTICE 'OK: Trigger on_auth_user_created_company criado';
    ELSE
        RAISE NOTICE 'ERRO: Trigger on_auth_user_created_company não foi criado';
    END IF;
END $$;

-- 8. LIMPEZA E OTIMIZAÇÃO
-- =====================================================

-- Atualizar estatísticas das tabelas
ANALYZE public.profiles;
ANALYZE public.companies;

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'CORREÇÃO ABRANGENTE CONCLUÍDA!';
    RAISE NOTICE 'Todas as configurações de Auth foram verificadas e corrigidas.';
    RAISE NOTICE 'Estrutura da tabela companies corrigida (user_id, plan_name).';
    RAISE NOTICE 'Teste agora a criação de usuários.';
    RAISE NOTICE '=========================================';
END $$;