# Configuração do Supabase

## Pré-requisitos

- Node.js instalado
- Docker instalado (para desenvolvimento local)
- Conta no Supabase

## Instalação do Supabase CLI

O Supabase CLI já foi instalado via Scoop. Para verificar:

```bash
supabase --version
```

## Configuração do Projeto

### 1. Variáveis de Ambiente

O arquivo `.env.local` foi criado com as configurações básicas:

```env
VITE_SUPABASE_URL=https://mjuxvppexydaeuoernxa.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### 2. Scripts Disponíveis

Foram adicionados os seguintes scripts no `package.json`:

- `npm run supabase:start` - Inicia o Supabase localmente
- `npm run supabase:stop` - Para o Supabase local
- `npm run supabase:status` - Verifica status dos serviços
- `npm run supabase:reset` - Reseta o banco local
- `npm run supabase:migrate` - Aplica migrações
- `npm run supabase:generate-types` - Gera tipos TypeScript
- `npm run db:seed` - Executa seeds do banco

## Desenvolvimento Local

### Iniciar Supabase Local

```bash
npm run supabase:start
```

Este comando irá:
- Iniciar containers Docker para PostgreSQL, Auth, Storage, etc.
- Aplicar todas as migrações
- Fornecer URLs locais para desenvolvimento

### Verificar Status

```bash
npm run supabase:status
```

### Aplicar Migrações

Para aplicar migrações ao banco remoto:

```bash
npm run supabase:migrate
```

## Configuração de Produção

### 1. Link com Projeto Remoto

Para conectar com o projeto remoto:

```bash
supabase login
supabase link --project-ref mjuxvppexydaeuoernxa
```

### 2. Executar Script de Correção

Para corrigir os nomes dos planos no banco de dados, execute o script `fix-plan-names.sql` no painel do Supabase:

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para SQL Editor
3. Cole o conteúdo do arquivo `supabase/migrations/fix-plan-names.sql`
4. Execute o script

## Estrutura de Arquivos

```
supabase/
├── config.toml              # Configuração do projeto
└── migrations/              # Migrações do banco
    ├── *.sql               # Arquivos de migração
    └── fix-plan-names.sql  # Script de correção dos planos
```

## Troubleshooting

### Erro de Conexão com Banco

Se houver erro ao conectar com o banco remoto:

1. Verifique se a senha do banco está correta
2. Confirme se o projeto ID está correto no `config.toml`
3. Verifique se você tem permissões no projeto

### Problemas com Docker

Se o Supabase local não iniciar:

1. Verifique se o Docker está rodando
2. Verifique se as portas não estão em uso
3. Execute `supabase stop` e tente novamente

### Regenerar Tipos TypeScript

Para atualizar os tipos após mudanças no schema:

```bash
npm run supabase:generate-types
```

## Links Úteis

- [Documentação do Supabase](https://supabase.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Dashboard do Projeto](https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa)