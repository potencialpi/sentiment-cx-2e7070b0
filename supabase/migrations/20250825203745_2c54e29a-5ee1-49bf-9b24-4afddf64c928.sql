-- CORREÇÃO CRÍTICA DE SEGURANÇA: Remover acesso público a dados sensíveis de checkout
-- A tabela checkout_sessions contém dados extremamente sensíveis que não devem ser publicamente acessíveis

-- Remover políticas perigosas que permitem acesso público total
DROP POLICY IF EXISTS "service_select_checkout_sessions" ON public.checkout_sessions;
DROP POLICY IF EXISTS "service_update_checkout_sessions" ON public.checkout_sessions;

-- Criar políticas seguras que restringem acesso apenas ao service role
-- Apenas o service role (backend) pode ler sessões de checkout
CREATE POLICY "service_role_only_select_checkout_sessions" 
ON public.checkout_sessions 
FOR SELECT 
TO service_role
USING (true);

-- Apenas o service role pode atualizar sessões de checkout
CREATE POLICY "service_role_only_update_checkout_sessions" 
ON public.checkout_sessions 
FOR UPDATE 
TO service_role
USING (true) 
WITH CHECK (true);

-- Apenas o service role pode deletar sessões de checkout (para limpeza)
CREATE POLICY "service_role_only_delete_checkout_sessions" 
ON public.checkout_sessions 
FOR DELETE 
TO service_role
USING (true);

-- Manter política de inserção pública apenas (necessária para criar checkout sessions)
-- mas verificar que a política existente está correta
DROP POLICY IF EXISTS "public_insert_checkout_sessions" ON public.checkout_sessions;
CREATE POLICY "allow_public_insert_checkout_sessions" 
ON public.checkout_sessions 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Adicionar comentários de segurança
COMMENT ON TABLE public.checkout_sessions IS 'TABELA SENSÍVEL: Contém dados de pagamento e informações pessoais. Acesso restrito apenas ao service role para operações backend.';
COMMENT ON POLICY "service_role_only_select_checkout_sessions" ON public.checkout_sessions IS 'SEGURANÇA: Apenas service role pode ler dados sensíveis de checkout';
COMMENT ON POLICY "service_role_only_update_checkout_sessions" ON public.checkout_sessions IS 'SEGURANÇA: Apenas service role pode atualizar dados sensíveis de checkout';
COMMENT ON POLICY "allow_public_insert_checkout_sessions" ON public.checkout_sessions IS 'Permite criação de sessões de checkout por usuários anônimos e autenticados';