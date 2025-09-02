-- Conceder permissões para a tabela magic_links
-- Permitir que usuários anônimos e autenticados acessem a tabela magic_links

-- Conceder permissões básicas para role anon (usuários não autenticados)
GRANT SELECT, INSERT ON magic_links TO anon;

-- Conceder permissões completas para role authenticated (usuários autenticados)
GRANT ALL PRIVILEGES ON magic_links TO authenticated;

-- Criar políticas RLS para permitir acesso aos magic links
-- Política para permitir inserção de novos magic links
CREATE POLICY "Allow insert magic links" ON magic_links
    FOR INSERT
    WITH CHECK (true);

-- Política para permitir leitura de magic links válidos (não expirados)
CREATE POLICY "Allow read valid magic links" ON magic_links
    FOR SELECT
    USING (expires_at > now());

-- Política para permitir atualização de magic links (marcar como usado)
CREATE POLICY "Allow update magic links" ON magic_links
    FOR UPDATE
    USING (expires_at > now())
    WITH CHECK (expires_at > now());

-- Verificar permissões atuais
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'magic_links'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;