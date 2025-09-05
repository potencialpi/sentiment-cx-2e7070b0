# 🔒 GUIA MANUAL DE CORREÇÃO DE SEGURANÇA

## ⚠️ PROBLEMA IDENTIFICADO

O teste de segurança detectou que a tabela `surveys` ainda permite **acesso SELECT anônimo**, o que representa uma vulnerabilidade de segurança.

## 🎯 SOLUÇÃO MANUAL NECESSÁRIA

Como a função `exec` não está disponível no Supabase, você precisa aplicar as correções manualmente através do **Supabase Dashboard**.

## 📋 PASSOS PARA CORREÇÃO

### 1. Acesse o Supabase Dashboard
- Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Faça login na sua conta
- Selecione seu projeto

### 2. Abra o SQL Editor
- No menu lateral, clique em **"SQL Editor"**
- Clique em **"New query"**

### 3. Execute o Script de Correção

Copie e cole o seguinte script SQL no editor:

```sql
-- =====================================================
-- CORREÇÃO CRÍTICA: REMOVER ACESSO ANÔNIMO DA TABELA SURVEYS
-- =====================================================

-- 1. REVOGAR TODOS OS PRIVILÉGIOS ANÔNIMOS
REVOKE ALL PRIVILEGES ON TABLE public.surveys FROM anon;
REVOKE SELECT ON TABLE public.surveys FROM anon;
REVOKE INSERT ON TABLE public.surveys FROM anon;
REVOKE UPDATE ON TABLE public.surveys FROM anon;
REVOKE DELETE ON TABLE public.surveys FROM anon;

-- 2. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- 3. REMOVER POLÍTICAS EXISTENTES QUE PODEM PERMITIR ACESSO ANÔNIMO
DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can view own surveys" ON public.surveys;
DROP POLICY IF EXISTS "auth_users_select_own_surveys" ON public.surveys;
DROP POLICY IF EXISTS "authenticated_users_select_own_surveys" ON public.surveys;

-- 4. CRIAR POLÍTICA RESTRITIVA APENAS PARA USUÁRIOS AUTENTICADOS
CREATE POLICY "secure_select_own_surveys" ON public.surveys
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "secure_insert_surveys" ON public.surveys
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "secure_update_own_surveys" ON public.surveys
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "secure_delete_own_surveys" ON public.surveys
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 5. VERIFICAR CONFIGURAÇÃO FINAL
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Habilitado'
        ELSE '❌ RLS Desabilitado'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'surveys';

-- 6. LISTAR POLÍTICAS ATIVAS
SELECT 
    policyname,
    roles,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'surveys'
ORDER BY policyname;
```

### 4. Execute o Script
- Clique no botão **"Run"** ou pressione `Ctrl+Enter`
- Aguarde a execução completa
- Verifique se não há erros na saída

### 5. Verificar os Resultados

Após executar o script, você deve ver:
- ✅ RLS Habilitado para a tabela surveys
- Políticas listadas apenas para usuários `authenticated`
- Nenhuma política para usuários `anon`

## 🧪 TESTE DA CORREÇÃO

Após aplicar a correção manual, execute o teste de segurança:

```bash
node test-complete-security.cjs
```

### Resultado Esperado:
```
📊 Testando tabela SURVEYS...
  ✅ SELECT anônimo BLOQUEADO: permission denied for table surveys
  ✅ INSERT anônimo BLOQUEADO: permission denied for table surveys
  ✅ UPDATE anônimo BLOQUEADO: permission denied for table surveys
  ✅ DELETE anônimo BLOQUEADO: permission denied for table surveys
```

## 🔍 VERIFICAÇÃO ADICIONAL

Se ainda houver problemas, execute também:

```sql
-- Verificar privilégios da role anon
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'surveys'
AND grantee = 'anon';
```

**Resultado esperado:** Nenhuma linha retornada (sem privilégios para anon)

## 🚨 IMPORTANTE

- **NÃO pule esta etapa manual** - é crítica para a segurança
- **Teste sempre** após aplicar as correções
- **Documente** qualquer erro encontrado
- **Backup** do banco antes de grandes mudanças

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs de erro no Supabase Dashboard
2. Confirme que você tem permissões de administrador
3. Execute os scripts de teste para validar

---

**Status:** 🔴 **AÇÃO MANUAL NECESSÁRIA**  
**Prioridade:** 🚨 **CRÍTICA**  
**Tempo estimado:** ⏱️ **5-10 minutos**