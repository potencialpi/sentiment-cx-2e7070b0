-- Remover políticas existentes que podem estar muito permissivas
DROP POLICY IF EXISTS "surveys_select_policy" ON surveys;
DROP POLICY IF EXISTS "surveys_insert_policy" ON surveys;
DROP POLICY IF EXISTS "surveys_update_policy" ON surveys;
DROP POLICY IF EXISTS "surveys_delete_policy" ON surveys;

DROP POLICY IF EXISTS "responses_select_policy" ON responses;
DROP POLICY IF EXISTS "responses_insert_policy" ON responses;
DROP POLICY IF EXISTS "responses_update_policy" ON responses;
DROP POLICY IF EXISTS "responses_delete_policy" ON responses;

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Criar políticas RLS mais restritivas para SURVEYS
-- Usuários autenticados só podem ver seus próprios surveys
CREATE POLICY "surveys_select_own_only" ON surveys
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Usuários autenticados só podem inserir surveys para si mesmos
CREATE POLICY "surveys_insert_own_only" ON surveys
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Usuários autenticados só podem atualizar seus próprios surveys
CREATE POLICY "surveys_update_own_only" ON surveys
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Usuários autenticados só podem deletar seus próprios surveys
CREATE POLICY "surveys_delete_own_only" ON surveys
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Criar políticas RLS para RESPONSES
-- Usuários autenticados podem ver responses de seus surveys
CREATE POLICY "responses_select_own_surveys" ON responses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Usuários anônimos podem inserir responses em surveys ativos
CREATE POLICY "responses_insert_anonymous" ON responses
    FOR INSERT
    TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.status = 'active'
        )
    );

-- Usuários autenticados podem inserir responses em surveys ativos
CREATE POLICY "responses_insert_authenticated" ON responses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.status = 'active'
        )
    );

-- Criar políticas RLS para PROFILES
-- Usuários só podem ver seu próprio perfil
CREATE POLICY "profiles_select_own_only" ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Usuários só podem atualizar seu próprio perfil
CREATE POLICY "profiles_update_own_only" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Garantir que RLS está habilitado
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verificar as políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles')
ORDER BY tablename, policyname;