# Correção do Erro: "Could not find 'question' column of 'surveys' in the schema cache"

## Problema Identificado

O erro ocorre devido a uma inconsistência no schema da tabela `surveys`. As migrations antigas criaram a tabela com uma coluna `questions` do tipo JSONB, mas posteriormente foi implementada uma estrutura com tabela separada `questions`. O cache do schema ainda está referenciando a estrutura antiga.

## Solução

### Opção 1: Executar Script SQL no Painel do Supabase (Recomendado)

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para "SQL Editor" no menu lateral
4. Abra o arquivo `fix_surveys_schema.sql` (criado na raiz do projeto)
5. Copie todo o conteúdo do arquivo
6. Cole no SQL Editor do Supabase
7. Clique em "Run" para executar o script

### Opção 2: Executar via CLI (se Docker estiver disponível)

```bash
cd supabase
npx supabase link --project-ref mjuxvppexydaeuoernxa
npx supabase db push
```

## O que o Script Faz

1. **Remove colunas problemáticas**: Remove as colunas `questions` e `question` da tabela `surveys` se existirem
2. **Adiciona colunas necessárias**: Garante que as colunas `unique_link`, `current_responses` e `status` existam
3. **Verifica a estrutura**: Mostra a estrutura final da tabela para confirmação
4. **Limpa o cache**: Força a atualização do cache do schema

## Estrutura Correta da Tabela `surveys`

Após a correção, a tabela `surveys` deve ter as seguintes colunas:

- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FOREIGN KEY)
- `title` (TEXT)
- `description` (TEXT)
- `unique_link` (TEXT, UNIQUE)
- `max_responses` (INTEGER)
- `current_responses` (INTEGER)
- `status` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Verificação

Após executar o script, teste criando uma nova pesquisa no AdminNexus para verificar se o erro foi resolvido.

## Arquivos Criados

- `fix_surveys_schema.sql`: Script SQL para correção
- `supabase/migrations/20250115000000_fix_surveys_schema.sql`: Migration para aplicação via CLI
- `CORREÇÃO_ERRO_SCHEMA.md`: Este arquivo de instruções