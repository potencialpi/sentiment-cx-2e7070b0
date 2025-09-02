-- Conceder permissões para a tabela surveys
-- Permitir que usuários anônimos e autenticados acessem a tabela surveys

-- Conceder permissões básicas para role anon (usuários não autenticados)
GRANT SELECT ON surveys TO anon;

-- Conceder permissões completas para role authenticated (usuários autenticados)
GRANT ALL PRIVILEGES ON surveys TO authenticated;

-- Criar políticas RLS para permitir acesso às pesquisas
-- Política para permitir leitura de pesquisas ativas
CREATE POLICY "Allow read active surveys" ON surveys
    FOR SELECT
    USING (status = 'active');

-- Política para permitir inserção de pesquisas (apenas usuários autenticados)
CREATE POLICY "Allow insert surveys for authenticated users" ON surveys
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para permitir atualização de pesquisas (apenas usuários autenticados)
CREATE POLICY "Allow update surveys for authenticated users" ON surveys
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verificar permissões atuais
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'surveys'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;