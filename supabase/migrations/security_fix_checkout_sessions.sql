-- CORREÇÃO CRÍTICA DE SEGURANÇA: Remover política pública de inserção em checkout_sessions
-- Substituir por política service-role-only para garantir que apenas edge functions possam criar sessões

-- Remover a política pública de inserção que permite acesso anônimo
DROP POLICY IF EXISTS "allow_public_insert_checkout_sessions" ON public.checkout_sessions;

-- Criar política service-role-only para inserção
-- Apenas edge functions (service_role) podem criar sessões de checkout
CREATE POLICY "service_role_only_insert_checkout_sessions" 
ON public.checkout_sessions 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Adicionar comentário de segurança
COMMENT ON POLICY "service_role_only_insert_checkout_sessions" ON public.checkout_sessions IS 'SEGURANÇA CRÍTICA: Apenas service role (edge functions) pode criar sessões de checkout. Previne exposição de dados sensíveis.';

-- Verificar que todas as políticas estão corretas
-- SELECT * FROM pg_policies WHERE tabl