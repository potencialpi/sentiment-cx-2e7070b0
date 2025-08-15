# Diagnóstico: Erro na Criação de Conta

## Problema Identificado
**Erro**: "Database error saving new user" / "Database error creating new user"
**Código**: `unexpected_failure`

## Localização do Erro
O erro aparece na mensagem mostrada ao usuário quando tenta criar uma nova conta através do formulário em `src/pages/CreateAccount.tsx`.

## Testes Realizados

### ✅ Configurações Verificadas
- ✅ Variáveis de ambiente (.env.local) estão corretas
- ✅ VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY configuradas
- ✅ Conexão com Supabase estabelecida
- ✅ Tabelas `profiles` e `companies` existem no banco
- ✅ Triggers e funções aplicadas via migrations

### ❌ Problemas Encontrados
- ❌ **Auth básico falha** mesmo usando service_role_key
- ❌ **SignUp simples falha** sem metadados
- ❌ **SignUp com metadados falha** 
- ❌ **Funções de trigger não podem ser verificadas** (erro de schema)

## Diagnóstico Final
**CAUSA RAIZ**: O problema está na **configuração básica do Supabase Auth**, não nos triggers ou no código da aplicação.

## Possíveis Causas
1. **Configuração do projeto Supabase**:
   - Auth pode estar desabilitado
   - Configurações de segurança muito restritivas
   - Problemas na configuração do banco de dados

2. **Limitações da conta Supabase**:
   - Projeto pode ter atingido limites
   - Problemas de billing/pagamento
   - Projeto pausado ou suspenso

3. **Configurações de Auth**:
   - Email confirmation obrigatória mas mal configurada
   - Políticas de senha muito restritivas
   - Configurações de domínio/CORS

## Próximos Passos Recomendados
1. **Verificar painel do Supabase**:
   - Status do projeto
   - Configurações de Authentication
   - Logs de erro no dashboard
   - Configurações de Email/SMTP

2. **Verificar configurações de Auth**:
   - Enable email confirmations
   - Password requirements
   - Allowed domains

3. **Testar com projeto Supabase novo**:
   - Criar projeto teste
   - Verificar se o problema persiste

## Código Onde o Erro Aparece
**Arquivo**: `src/pages/CreateAccount.tsx`
**Linha**: ~150-160 (tratamento de erro do supabase.auth.signUp)

```typescript
if (error) {
  console.error('Erro ao criar conta:', error);
  setError(error.message || 'Erro ao criar conta. Tente novamente.');
  return;
}
```

O erro "Database error saving new user" vem diretamente do Supabase Auth, não é uma mensagem customizada da aplicação.