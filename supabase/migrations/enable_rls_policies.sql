-- Habilitar RLS nas tabelas principais
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela surveys
-- Usuários autenticados podem ver apenas seus próprios surveys
CREATE POLICY "Users can view own surveys" ON public.surveys
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários autenticados podem inserir surveys
CREATE POLICY "Users can insert own surveys" ON public.surveys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários autenticados podem atualizar seus próprios surveys
CREATE POLICY "Users can update own surveys" ON public.surveys
    FOR UPDATE USING (auth.uid() = user_id);

-- Usuários autenticados podem deletar seus próprios surveys
CREATE POLICY "Users can delete own surveys" ON public.surveys
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para tabela responses
-- Usuários autenticados podem ver responses de seus surveys
CREATE POLICY "Users can view responses to own surveys" ON public.responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.user_id = auth.uid()
        )
    );

-- Usuários anônimos podem inserir responses em surveys ativos
CREATE POLICY "Anonymous users can insert responses" ON public.responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = responses.survey_id 
            AND surveys.status = 'active'
        )
    );

-- Políticas para tabela profiles
-- Usuários podem ver apenas seu próprio profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem atualizar apenas seu próprio profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Conceder permissões básicas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT SELECT, INSERT ON public.responses TO authenticated;
GRANT SELECT, INSERT ON public.responses TO anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles')
ORDER BY tablename, policyname;