# Guia para Deletar Usuários de Teste no Supabase

## ⚠️ ATENÇÃO
**Este processo irá deletar permanentemente os dados dos usuários. Use apenas em ambiente de desenvolvimento/teste!**

## Métodos para Deletar Usuários

### Método 1: Via Dashboard do Supabase (Recomendado)

1. **Acesse o Dashboard do Supabase:**
   - Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Faça login na sua conta
   - Selecione o projeto `mjuxvppexydaeuoernxa`

2. **Deletar via Authentication:**
   - No menu lateral, clique em "Authentication"
   - Clique em "Users"
   - Selecione os usuários que deseja deletar
   - Clique no ícone de lixeira ou use a opção "Delete user"
   - Confirme a exclusão

3. **Verificar Tabelas Relacionadas:**
   - Vá para "Table Editor"
   - Verifique se as tabelas `profiles`, `surveys` e `responses` foram limpas automaticamente (devido ao CASCADE)

### Método 2: Via SQL Editor no Dashboard

1. **Acesse o SQL Editor:**
   - No dashboard do Supabase, clique em "SQL Editor"
   - Crie uma nova query

2. **Execute o Script de Limpeza:**
   ```sql
   -- Para deletar TODOS os usuários (cuidado!)
   DELETE FROM auth.users;
   
   -- OU para deletar usuários específicos por email:
   DELETE FROM auth.users WHERE email IN (
     'usuario1@teste.com',
     'usuario2@teste.com'
   );
   
   -- OU para deletar usuários criados hoje:
   DELETE FROM auth.users WHERE DATE(created_at) = CURRENT_DATE;
   ```

3. **Verificar a Limpeza:**
   ```sql
   SELECT COUNT(*) as total_users FROM auth.users;
   SELECT COUNT(*) as total_profiles FROM public.profiles;
   SELECT COUNT(*) as total_surveys FROM public.surveys;
   SELECT COUNT(*) as total_responses FROM public.responses;
   ```

### Método 3: Via Arquivo SQL (Avançado)

1. **Use o arquivo `delete-test-users.sql`** que foi criado no projeto
2. **Edite o arquivo** para especificar quais usuários deletar
3. **Execute no SQL Editor** do Supabase Dashboard

## Estrutura das Tabelas

O sistema possui as seguintes tabelas principais:
- `auth.users` - Usuários do sistema de autenticação
- `public.profiles` - Perfis dos usuários com informações do plano
- `public.surveys` - Pesquisas criadas pelos usuários
- `public.responses` - Respostas às pesquisas

**Importante:** Devido às foreign keys com CASCADE, ao deletar um usuário da tabela `auth.users`, todos os dados relacionados (perfil, pesquisas e respostas) serão deletados automaticamente.

## Após a Limpeza

1. **Teste o Sistema:**
   - Acesse a aplicação
   - Crie novos usuários de teste
   - Verifique se o fluxo de login e seleção de planos está funcionando

2. **Verifique o Roteamento:**
   - Teste o login com diferentes planos
   - Confirme se o redirecionamento para as páginas administrativas está correto
   - Teste a criação de pesquisas

## Comandos Úteis para Verificação

```sql
-- Ver todos os usuários
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Ver perfis de usuários
SELECT p.*, u.email FROM public.profiles p 
JOIN auth.users u ON p.user_id = u.id;

-- Ver pesquisas por usuário
SELECT s.*, u.email FROM public.surveys s 
JOIN auth.users u ON s.user_id = u.id;

-- Contar registros em cada tabela
SELECT 
  (SELECT COUNT(*) FROM auth.users) as users,
  (SELECT COUNT(*) FROM public.profiles) as profiles,
  (SELECT COUNT(*) FROM public.surveys) as surveys,
  (SELECT COUNT(*) FROM public.responses) as responses;
```

## Dicas de Segurança

- ✅ **Sempre faça backup** antes de deletar dados
- ✅ **Use ambiente de desenvolvimento** para testes
- ✅ **Confirme o projeto correto** antes de executar comandos
- ❌ **Nunca execute em produção** sem extremo cuidado
- ❌ **Não delete todos os usuários** se houver dados importantes