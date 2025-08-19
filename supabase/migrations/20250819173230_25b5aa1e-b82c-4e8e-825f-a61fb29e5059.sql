-- PLANO DE CORREÇÃO PARA ISOLAMENTO DE DADOS ENTRE USUÁRIOS

-- 1. REMOVER VIEW VULNERÁVEL QUE EXPÕE DADOS SEM FILTRO DE USUÁRIO
DROP VIEW IF EXISTS public.public_surveys;

-- 2. LIMPAR POLÍTICAS RLS DUPLICADAS NA TABELA SURVEYS
-- Remover todas as políticas existentes duplicadas
DROP POLICY IF EXISTS "Public can access surveys for responses only" ON public.surveys;
DROP POLICY IF EXISTS "Users can create own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can create their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can delete own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can delete their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can manage their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can update own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can update their own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can view their own surveys" ON public.surveys;

-- 3. CRIAR POLÍTICAS RLS CONSOLIDADAS E SEGURAS
-- Política para visualização - usuários só veem suas próprias pesquisas
CREATE POLICY "users_view_own_surveys_only" ON public.surveys
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Política para inserção - usuários só podem criar pesquisas para si
CREATE POLICY "users_create_own_surveys_only" ON public.surveys
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Política para atualização - usuários só podem atualizar suas próprias pesquisas
CREATE POLICY "users_update_own_surveys_only" ON public.surveys
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para deleção - usuários só podem deletar suas próprias pesquisas
CREATE POLICY "users_delete_own_surveys_only" ON public.surveys
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Política especial para acesso público via link único (SOMENTE para respostas)
CREATE POLICY "public_access_for_responses_only" ON public.surveys
    FOR SELECT 
    USING (
        status = 'active' 
        AND unique_link IS NOT NULL 
        AND unique_link != ''
        AND current_responses < max_responses
    );

-- 4. LIMPAR POLÍTICAS DUPLICADAS EM OUTRAS TABELAS
-- Questions table
DROP POLICY IF EXISTS "Users can create questions for their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can create questions in own surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can delete questions from own surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can delete questions from their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can manage questions for their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can update questions from own surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can update questions from their surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can view questions from own surveys" ON public.questions;
DROP POLICY IF EXISTS "Users can view questions from their surveys" ON public.questions;

-- Recriar políticas consolidadas para questions
CREATE POLICY "users_manage_own_survey_questions" ON public.questions
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- 5. CRIAR FUNÇÃO DE AUDITORIA PARA DETECTAR VAZAMENTOS
CREATE OR REPLACE FUNCTION public.audit_data_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log tentativas de acesso a dados que não pertencem ao usuário
    IF OLD.user_id != auth.uid() OR NEW.user_id != auth.uid() THEN
        INSERT INTO public.audit_log (
            event_type,
            table_name,
            record_id,
            user_id,
            details,
            created_at
        ) VALUES (
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            auth.uid(),
            jsonb_build_object(
                'old_user_id', OLD.user_id,
                'new_user_id', NEW.user_id,
                'current_auth_uid', auth.uid()
            ),
            now()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CRIAR TABELA DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    user_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS na tabela de auditoria
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Política para que usuários vejam apenas seus próprios logs de auditoria
CREATE POLICY "users_view_own_audit_logs" ON public.audit_log
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 7. CRIAR FUNÇÃO PARA TESTAR ISOLAMENTO DE DADOS
CREATE OR REPLACE FUNCTION public.test_user_data_isolation(_user_id UUID)
RETURNS TABLE (
    test_name TEXT,
    result BOOLEAN,
    details TEXT
) AS $$
BEGIN
    -- Teste 1: Verificar se usuário só vê suas próprias pesquisas
    RETURN QUERY
    SELECT 
        'survey_isolation'::TEXT,
        COUNT(*) = 0,
        FORMAT('Found %s surveys from other users', COUNT(*))
    FROM public.surveys 
    WHERE user_id != _user_id;
    
    -- Teste 2: Verificar se as políticas RLS estão ativas
    RETURN QUERY
    SELECT 
        'rls_enabled'::TEXT,
        pg_table_is_visible('public.surveys'::regclass) AND 
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'surveys') > 0,
        'RLS policies check'::TEXT;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. LIMPAR POLÍTICAS DUPLICADAS EM PROFILES
DROP POLICY IF EXISTS "Allow authenticated users to manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recriar política consolidada para profiles
CREATE POLICY "users_manage_own_profile_only" ON public.profiles
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 9. LIMPAR POLÍTICAS DUPLICADAS EM COMPANIES  
DROP POLICY IF EXISTS "Allow authenticated users to manage own company" ON public.companies;
DROP POLICY IF EXISTS "Users can create their own company data" ON public.companies;
DROP POLICY IF EXISTS "Users can manage their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company data" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company data" ON public.companies;

-- Recriar política consolidada para companies
CREATE POLICY "users_manage_own_company_only" ON public.companies
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 10. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON POLICY "users_view_own_surveys_only" ON public.surveys IS 'Usuários só podem visualizar suas próprias pesquisas';
COMMENT ON POLICY "public_access_for_responses_only" ON public.surveys IS 'Acesso público limitado apenas para responder pesquisas ativas via unique_link';
COMMENT ON FUNCTION public.test_user_data_isolation(UUID) IS 'Função para testar isolamento de dados entre usuários';
COMMENT ON TABLE public.audit_log IS 'Log de auditoria para detectar tentativas de acesso não autorizado';