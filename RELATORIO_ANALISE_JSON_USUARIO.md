# Relatório de Análise - JSON de Registro de Usuário

## Resumo Executivo

Este relatório analisa o JSON de registro do usuário `anderson@potencialpi.com.br` identificando problemas críticos de segurança, estrutura e compatibilidade com o sistema Supabase.

## 🚨 Problemas Críticos Identificados

### 1. **PROBLEMA DE SEGURANÇA GRAVE - Hash de Senha Duplicado**

**Problema:** O JSON contém dois hashes de senha diferentes:
- `encrypted_password`: `$2a$10$K2RMk/U/QQETGlRFnjghbeRlFVADqexQ.KpjLxl2VRIcljJ5HwkoO` (bcrypt)
- `raw_user_meta_data.original_password_hash`: `050e063bf779e29eaa724e268c5df6f525e07ecb9762968558751cfc53db628b` (SHA-256)

**Risco:** 
- Exposição de hash SHA-256 inseguro nos metadados
- Possível vulnerabilidade de segurança
- Inconsistência entre sistemas de hash

**Correção:** Remover `original_password_hash` dos metadados imediatamente

### 2. **Instance ID Inválido**

**Problema:** `instance_id` está definido como `00000000-0000-0000-0000-000000000000`

**Impacto:** 
- UUID nulo indica problema na criação do usuário
- Pode causar conflitos no sistema
- Violação das boas práticas do Supabase

**Correção:** Gerar UUID válido ou definir como `null`

### 3. **Incompatibilidade de Plano**

**Problema:** `plan_id` definido como `nexus-infinito` nos metadados

**Impacto:**
- Plano não existe no sistema atual
- Pode causar erros na criação do profile
- Incompatibilidade com `planConfigs.ts`

**Correção:** Usar plano válido como `nexus-premium` ou `start-quantico`

### 4. **Campos Duplicados**

**Problemas identificados:**
- `providers` aparece tanto em `raw_app_meta_data.providers` quanto como campo raiz
- Redundância desnecessária

**Correção:** Manter apenas em `raw_app_meta_data.providers`

### 5. **Tokens de Segurança Vazios**

**Problema:** Vários tokens estão como string vazia em vez de `null`:
- `confirmation_token: ""`
- `recovery_token: ""`
- `email_change_token_new: ""`
- `phone_change_token: ""`
- `reauthentication_token: ""`

**Impacto:** Pode causar problemas de validação

**Correção:** Definir como `null` quando não utilizados

## 📊 Análise de Compatibilidade com Schema

### ✅ Campos Compatíveis
- Estrutura geral da tabela `auth.users`
- Tipos de dados corretos para maioria dos campos
- Timestamps em formato ISO correto
- Email válido

### ❌ Incompatibilidades

1. **Campo `phone`:**
   - JSON: `null`
   - Schema: `text` com default `NULL::character varying`
   - Status: ✅ Compatível

2. **Campo `confirmed_at`:**
   - JSON: `"2025-08-28 20:44:46.515724+00"`
   - Schema: Campo gerado automaticamente
   - Status: ⚠️ Pode ser sobrescrito

## 🔍 Análise dos Metadados

### raw_user_meta_data - Problemas:

```json
{
  "plan_id": "nexus-infinito",        // ❌ Plano inexistente
  "billing_type": "yearly",           // ✅ Válido
  "company_name": "Caldo de cana zurita", // ✅ Válido
  "phone_number": "11915946212",      // ✅ Válido
  "email_verified": true,             // ✅ Válido
  "original_password_hash": "..."     // 🚨 CRÍTICO - Remover
}
```

## 🛠️ Correções Recomendadas

### Correção Imediata (Crítica):

```json
{
  "instance_id": null,
  "raw_user_meta_data": {
    "plan_id": "nexus-premium",
    "billing_type": "yearly",
    "company_name": "Caldo de cana zurita",
    "phone_number": "11915946212",
    "email_verified": true
    // ❌ Remover: "original_password_hash"
  },
  "confirmation_token": null,
  "recovery_token": null,
  "email_change_token_new": null,
  "phone_change_token": null,
  "reauthentication_token": null
  // ❌ Remover: campo "providers" duplicado
}
```

### Script de Correção SQL:

```sql
-- Limpar hash inseguro dos metadados
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'original_password_hash'
WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- Corrigir plano
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{plan_id}', 
  '"nexus-premium"'
)
WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- Limpar instance_id inválido
UPDATE auth.users 
SET instance_id = null
WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';
```

## 🎯 Impacto no Sistema

### Problemas que podem causar:
1. **Falha na criação do profile** devido ao plano inexistente
2. **Vulnerabilidade de segurança** com hash exposto
3. **Erros de autenticação** devido aos tokens malformados
4. **Problemas de billing** com plano inválido

### Funcionalidades afetadas:
- ❌ Dashboard (RLS pode falhar)
- ❌ Checkout (plano inválido)
- ❌ Profile creation
- ✅ Login básico (funcionará)

## 📋 Checklist de Validação

- [ ] Remover `original_password_hash` dos metadados
- [ ] Corrigir `plan_id` para valor válido
- [ ] Limpar `instance_id` inválido
- [ ] Converter tokens vazios para `null`
- [ ] Remover campo `providers` duplicado
- [ ] Validar criação do profile correspondente
- [ ] Testar acesso ao dashboard
- [ ] Verificar funcionalidade de checkout

## 🔒 Recomendações de Segurança

1. **Auditoria completa:** Verificar se outros usuários têm o mesmo problema
2. **Política de senhas:** Implementar validação para evitar hashes duplicados
3. **Limpeza de metadados:** Remover dados sensíveis desnecessários
4. **Monitoramento:** Implementar alertas para UUIDs inválidos

## 📊 Status Final

| Categoria | Status | Prioridade |
|-----------|--------|------------|
| Segurança | 🚨 Crítico | Alta |
| Estrutura | ⚠️ Problemas | Média |
| Compatibilidade | ⚠️ Parcial | Média |
| Funcionalidade | ❌ Limitada | Alta |

**Conclusão:** O JSON apresenta problemas críticos que devem ser corrigidos imediatamente antes de qualquer operação no sistema.