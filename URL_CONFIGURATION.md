# Configuração de URLs para Produção

## 🎯 Problema Resolvido

O erro `net::ERR_CONNECTION_REFUSED http://localhost:5173/success` foi causado por configurações hardcoded de localhost nas funções Supabase Edge Functions. Este documento explica as correções implementadas.

## 🔧 Correções Implementadas

### 1. Funções Supabase Edge Functions

As seguintes funções foram corrigidas para usar URLs dinâmicas:

#### `create-checkout-guest/index.ts`
- **Antes**: URLs hardcoded com lógica complexa forçando localhost
- **Depois**: URLs dinâmicas usando `FRONTEND_URL` ou origin do request

```typescript
// ANTES (problemático)
success_url: `${(() => { 
  const base = Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || 'http://localhost:8080'; 
  return (base.includes('localhost') || base.includes('127.0.0.1')) ? 'http://localhost:8080' : base; 
})()}/payment-success?session_id={CHECKOUT_SESSION_ID}`

// DEPOIS (correto)
success_url: `${Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || 'https://sentiment-cx.vercel.app'}/payment-success?session_id={CHECKOUT_SESSION_ID}`
```

#### `create-checkout-guest-v2/index.ts`
- Removida lógica que forçava localhost
- URL padrão alterada para produção

#### `create-checkout/index.ts`
- URL padrão alterada de `http://localhost:8080` para `https://sentiment-cx.vercel.app`

### 2. Configuração Supabase (`config.toml`)

```toml
# ANTES
site_url = "http://127.0.0.1:8080"
additional_redirect_urls = ["http://127.0.0.1:8080", "http://localhost:8080"]

# DEPOIS
site_url = "https://sentiment-cx.vercel.app"
additional_redirect_urls = [
  "http://127.0.0.1:8080",           # Para desenvolvimento local
  "http://localhost:8080", 
  "https://127.0.0.1:8080", 
  "https://localhost:8080",
  "https://sentiment-cx.vercel.app",  # Para produção
  "https://*.vercel.app"              # Para preview deployments
]
```

### 3. Variáveis de Ambiente

Adicionada configuração no `.env.example`:

```bash
# URL do frontend para redirecionamentos (usado pelas Edge Functions)
# Para desenvolvimento local: http://localhost:8080
# Para produção: https://seu-dominio.com
FRONTEND_URL=https://sentiment-cx.vercel.app
```

## 🚀 Como Configurar para Produção

### 1. Variáveis de Ambiente no Vercel

No painel do Vercel, configure:

```bash
FRONTEND_URL=https://seu-dominio-producao.com
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 2. Configuração no Supabase Dashboard

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **Authentication > Settings**
3. Configure:
   - **Site URL**: `https://seu-dominio-producao.com`
   - **Redirect URLs**: Adicione todas as URLs necessárias

### 3. Para Desenvolvimento Local

Crie `.env.local`:

```bash
FRONTEND_URL=http://localhost:8080
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

## 🔍 Como as URLs são Resolvidas

As Edge Functions agora seguem esta ordem de prioridade:

1. **`FRONTEND_URL`** (variável de ambiente)
2. **`req.headers.get('origin')`** (origin do request)
3. **URL padrão de produção** (`https://sentiment-cx.vercel.app`)

## ✅ Verificação

Para verificar se está funcionando:

1. **Desenvolvimento**: URLs devem apontar para `localhost:8080`
2. **Produção**: URLs devem apontar para seu domínio de produção
3. **Logs**: Verifique os logs das Edge Functions no Supabase Dashboard

## 🚨 Importante

- **Nunca** commite URLs de produção hardcoded no código
- **Sempre** use variáveis de ambiente para configurações específicas do ambiente
- **Teste** os redirecionamentos em ambos os ambientes (dev e prod)
- **Configure** as URLs no painel do Supabase para permitir redirecionamentos

## 📝 Checklist de Deploy

- [ ] Configurar `FRONTEND_URL` no Vercel
- [ ] Atualizar Site URL no Supabase Dashboard
- [ ] Adicionar domínio de produção nas Redirect URLs
- [ ] Testar fluxo de pagamento completo
- [ ] Verificar logs das Edge Functions
- [ ] Confirmar redirecionamentos funcionando