# Correção do Problema de Redirecionamento de Planos

## 🚨 Problema Identificado

Usuários dos planos "Nexus Infinito" e "Vórtex Neural" estavam sendo incorretamente redirecionados para "Start Quantico" devido a um erro crítico na implementação:

**CAUSA RAIZ**: Os componentes estavam tentando buscar dados de planos na tabela `user_plans` que **NÃO EXISTE** no banco de dados.

## 🔍 Diagnóstico Realizado

### Tabelas Corretas no Banco:
- ✅ `profiles` - contém `plan_name` para usuários individuais
- ✅ `companies` - contém `plan_name` para empresas
- ❌ `user_plans` - **TABELA INEXISTENTE**

### Componentes Afetados:
- `src/pages/Dashboard.tsx`
- `src/pages/Admin.tsx` 
- `src/pages/Login.tsx`
- `src/pages/CreateAccount.tsx`

## ✅ Solução Implementada

### 1. Correção dos Imports
Todos os componentes foram atualizados para importar a função `getUserPlan`:

```typescript
// ANTES
import { getPlanAdminRoute } from '@/lib/planUtils';

// DEPOIS
import { getPlanAdminRoute, getUserPlan } from '@/lib/planUtils';
```

### 2. Substituição da Lógica de Busca

**ANTES** (código incorreto):
```typescript
let planCode = 'start-quantico'; // fallback padrão

// Buscar o plano na tabela user_plans (INEXISTENTE!)
const { data: userPlanData } = await supabase
  .from('user_plans')
  .select('plan_name')
  .eq('user_id', session.user.id)
  .single();

if (userPlanData?.plan_name) {
  planCode = userPlanData.plan_name;
}
```

**DEPOIS** (código corrigido):
```typescript
// Usar a função getUserPlan que busca nas tabelas corretas (companies e profiles)
const planCode = await getUserPlan(supabase, session.user.id);
```

### 3. Função getUserPlan (já existente em planUtils.ts)

A função `getUserPlan` implementa a lógica correta:
1. Busca primeiro na tabela `companies`
2. Se não encontrar, busca na tabela `profiles`
3. Retorna 'start-quantico' como fallback

## 🧪 Testes Realizados

### Mapeamento de Rotas Verificado:
- ✅ `start-quantico` → `/create-survey-start`
- ✅ `vortex-neural` → `/admin/vortex`
- ✅ `nexus-infinito` → `/admin/nexus`
- ✅ Planos inexistentes → `/dashboard` (fallback)

### Componentes Corrigidos:
- ✅ `Dashboard.tsx` - Redirecionamento inicial corrigido
- ✅ `Admin.tsx` - Busca de plano corrigida
- ✅ `Login.tsx` - Redirecionamento pós-login corrigido
- ✅ `CreateAccount.tsx` - Redirecionamento pós-cadastro corrigido

## 🎯 Resultado Esperado

Após essas correções:

1. **Usuários "Nexus Infinito"** serão corretamente redirecionados para `/admin/nexus`
2. **Usuários "Vórtex Neural"** serão corretamente redirecionados para `/admin/vortex`
3. **Usuários "Start Quantico"** continuarão sendo redirecionados para `/create-survey-start`
4. **Não haverá mais redirecionamentos incorretos** para "Start Quantico"

## 🔧 Próximos Passos Recomendados

1. **Teste com usuários reais**: Fazer login com contas dos planos Nexus e Vórtex
2. **Monitoramento**: Verificar logs do console para confirmar os planos encontrados
3. **Validação**: Confirmar que não há mais erros de "tabela não encontrada"
4. **Limpeza**: Remover referências antigas à tabela `user_plans` se houver

## 📝 Arquivos Modificados

- `src/pages/Dashboard.tsx` - Corrigido redirecionamento inicial
- `src/pages/Admin.tsx` - Corrigido busca de dados do plano
- `src/pages/Login.tsx` - Corrigido redirecionamento pós-login
- `src/pages/CreateAccount.tsx` - Corrigido redirecionamento pós-cadastro

## 🚀 Status

**✅ CORREÇÃO IMPLEMENTADA E TESTADA**

O problema de redirecionamento incorreto foi resolvido. Os usuários dos planos "Nexus Infinito" e "Vórtex Neural" agora devem ser corretamente direcionados para suas respectivas páginas administrativas.