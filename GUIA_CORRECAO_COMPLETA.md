# 🔧 GUIA COMPLETO DE CORREÇÃO DO BANCO DE DADOS SUPABASE

## 📋 RESUMO DO DIAGNÓSTICO

O teste inicial revelou:
- ✅ **Todas as 7 tabelas principais existem e estão acessíveis**
- ✅ **A coluna problemática 'questions' já foi removida da tabela surveys**
- ⚠️ **Erros de RLS são esperados (sem autenticação nos testes)**
- 🔧 **Algumas correções estruturais ainda são necessárias**

## 🎯 INSTRUÇÕES PARA CORREÇÃO COMPLETA

### PASSO 1: Executar Script de Correção no Supabase

1. **Acesse o Supabase Dashboard:**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New query"

3. **Execute o Script de Correção:**
   - Copie todo o conteúdo do arquivo `fix_complete_database_schema.sql`
   - Cole no SQL Editor
   - Clique em "Run" (ou pressione Ctrl+Enter)

4. **Verifique os Resultados:**
   - O script deve executar sem erros
   - Você verá uma lista das tabelas criadas/corrigidas
   - A mensagem final deve ser: "🎯 CORREÇÃO COMPLETA DO BANCO DE DADOS FINALIZADA!"

### PASSO 2: Verificar as Correções

Após executar o script, execute o teste de verificação:

```bash
node test_database_after_fix.cjs
```

### PASSO 3: Testar a Aplicação

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Teste as funcionalidades principais:**
   - Login/Cadastro de usuários
   - Criação de pesquisas
   - Adição de perguntas
   - Gerenciamento de respondentes

## 🔍 O QUE O SCRIPT DE CORREÇÃO FAZ

### 1. **Correções na Tabela SURVEYS:**
- ❌ Remove coluna `questions` (problemática)
- ❌ Remove coluna `question` (problemática)
- ❌ Remove coluna `is_active` (substituída por `status`)
- ❌ Remove coluna `unique_link_id` (substituída por `unique_link`)
- ✅ Adiciona coluna `unique_link` (TEXT UNIQUE)
- ✅ Adiciona coluna `current_responses` (INTEGER DEFAULT 0)
- ✅ Adiciona coluna `status` (TEXT DEFAULT 'active')

### 2. **Correções na Tabela RESPONSES:**
- ❌ Remove coluna `answers` (substituída por `responses`)
- ❌ Remove coluna `respondent_ip` (desnecessária)
- ✅ Adiciona coluna `respondent_id` (UUID)
- ✅ Adiciona coluna `responses` (JSONB)
- ✅ Adiciona coluna `sentiment_score` (INTEGER)
- ✅ Adiciona coluna `sentiment_category` (TEXT)

### 3. **Correções na Tabela PROFILES:**
- 🔄 Renomeia `plan_type` para `plan_name` (se existir)
- ✅ Adiciona coluna `status` (se não existir)
- 🔧 Corrige valores de planos para formato correto

### 4. **Políticas RLS Completas:**
- 🛡️ Cria políticas para todas as tabelas
- 🔐 Garante segurança adequada
- 👥 Permite acesso público apenas para respostas

### 5. **Índices de Performance:**
- ⚡ Cria índices em colunas frequentemente consultadas
- 🚀 Melhora performance das consultas

### 6. **Triggers e Funções:**
- ⏰ Atualização automática de `updated_at`
- 🔄 Triggers para todas as tabelas relevantes

## 🚨 PROBLEMAS CONHECIDOS E SOLUÇÕES

### Problema: "new row violates row-level security policy"
**Solução:** Este erro é esperado nos testes sem autenticação. Na aplicação real com usuários autenticados, funcionará normalmente.

### Problema: "column does not exist"
**Solução:** O script de correção remove colunas problemáticas e adiciona as corretas.

### Problema: Dados inconsistentes
**Solução:** O script corrige nomes de planos e estruturas de dados.

## ✅ CHECKLIST DE VERIFICAÇÃO

Após executar as correções, verifique:

- [ ] Script executado sem erros no Supabase Dashboard
- [ ] Teste `test_database_after_fix.cjs` executado
- [ ] Aplicação iniciada com `npm run dev`
- [ ] Login funcionando
- [ ] Criação de pesquisas funcionando
- [ ] Adição de perguntas funcionando
- [ ] Gerenciamento de respondentes funcionando

## 🆘 SUPORTE

Se encontrar problemas:

1. **Verifique os logs do Supabase Dashboard**
2. **Execute o teste de diagnóstico novamente**
3. **Verifique se todas as variáveis de ambiente estão corretas**
4. **Confirme que o projeto Supabase está ativo**

## 📁 ARQUIVOS CRIADOS

- `fix_complete_database_schema.sql` - Script principal de correção
- `test_database_after_fix.cjs` - Script de teste e verificação
- `GUIA_CORRECAO_COMPLETA.md` - Este guia de instruções

---

**🎯 Objetivo:** Garantir que todas as tabelas, colunas, políticas RLS e estruturas necessárias estejam corretas no Supabase para o funcionamento completo da aplicação de análise de sentimentos.