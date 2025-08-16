# Configuração da Integração Stripe

Este documento descreve como configurar e usar a integração do Stripe para pagamentos na aplicação Sentiment CX.

## 📋 Pré-requisitos

1. Conta no Stripe criada
2. Produtos e preços configurados no Dashboard do Stripe
3. Projeto Supabase configurado

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env`:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_seu_publishable_key_aqui
STRIPE_SECRET_KEY=sk_test_seu_secret_key_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_aqui
```

### 2. Configuração dos Price IDs

No arquivo `src/lib/stripe.ts`, atualize os Price IDs com os valores do seu Dashboard Stripe:

```typescript
export const STRIPE_PRICE_IDS = {
  'vortex-neural': {
    monthly: 'price_seu_price_id_vortex_mensal',
    yearly: 'price_seu_price_id_vortex_anual'
  },
  'nexus-infinito': {
    monthly: 'price_seu_price_id_nexus_mensal', 
    yearly: 'price_seu_price_id_nexus_anual'
  }
};
```

### 3. Configuração do Banco de Dados

Execute o script SQL no seu projeto Supabase:

```bash
# Execute o arquivo supabase-schema.sql no SQL Editor do Supabase
```

Este script irá:
- Adicionar colunas relacionadas ao Stripe na tabela `profiles`
- Criar a tabela `transactions` para armazenar histórico de pagamentos
- Configurar políticas RLS (Row Level Security)
- Criar índices para melhor performance

### 4. Configuração de Webhooks (Produção)

Para produção, configure um endpoint de webhook no Stripe:

1. Acesse o Dashboard do Stripe
2. Vá em "Developers" > "Webhooks"
3. Clique em "Add endpoint"
4. Configure a URL: `https://seu-dominio.com/api/webhooks/stripe`
5. Selecione os eventos:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`

## 🚀 Como Usar

### Fluxo de Pagamento

1. **Seleção de Plano**: Usuário escolhe um plano na página `/choose-plan`
2. **Criação de Conta**: Usuário preenche dados na página `/create-account`
3. **Checkout**: Após criar a conta, o componente `StripeCheckout` é exibido
4. **Pagamento**: Usuário é redirecionado para o Stripe para completar o pagamento
5. **Confirmação**: Usuário retorna para `/payment-success` ou `/payment-cancel`

### Componentes Principais

- **`StripeCheckout`**: Componente principal para processar pagamentos
- **`PaymentSuccess`**: Página de confirmação de pagamento bem-sucedido
- **`PaymentCancel`**: Página para pagamentos cancelados

### Funções Utilitárias

- **`createCheckoutSession()`**: Cria sessão de checkout do Stripe
- **`getStripePriceId()`**: Obtém o Price ID correto baseado no plano e tipo de cobrança
- **`handleStripeWebhook()`**: Processa eventos de webhook do Stripe
- **`checkUserSubscription()`**: Verifica status da assinatura do usuário

## 🧪 Teste

### Ambiente de Desenvolvimento

1. Inicie o servidor: `npm run dev`
2. Acesse: `http://localhost:8080`
3. Navegue para `/choose-plan`
4. Selecione um plano e tipo de cobrança
5. Preencha os dados da conta
6. Teste o fluxo de checkout

### Cartões de Teste do Stripe

- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **Requer autenticação**: `4000 0025 0000 3155`

Use qualquer data futura para expiração e qualquer CVC de 3 dígitos.

## 📊 Monitoramento

### Logs

Os eventos são logados no console. Em produção, configure um sistema de logging adequado.

### Dashboard do Stripe

Monitore pagamentos, assinaturas e eventos no Dashboard do Stripe:
- Payments: Visualizar transações
- Subscriptions: Gerenciar assinaturas
- Events: Monitorar webhooks

### Supabase

Verifique os dados no Supabase:
- Tabela `profiles`: Status de assinatura dos usuários
- Tabela `transactions`: Histórico de transações

## 🔒 Segurança

1. **Nunca exponha** a Secret Key do Stripe no frontend
2. **Sempre valide** webhooks usando o Webhook Secret
3. **Use HTTPS** em produção
4. **Configure RLS** adequadamente no Supabase
5. **Monitore** transações suspeitas

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de Price ID não encontrado**
   - Verifique se os Price IDs estão corretos no `stripe.ts`
   - Confirme se os produtos estão ativos no Stripe

2. **Webhook não funciona**
   - Verifique se o endpoint está configurado corretamente
   - Confirme se o Webhook Secret está correto
   - Teste usando o Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

3. **Usuário não é atualizado após pagamento**
   - Verifique os logs do webhook
   - Confirme se as políticas RLS estão configuradas
   - Teste manualmente no SQL Editor do Supabase

### Logs Úteis

```javascript
// Verificar status de assinatura
console.log(await checkUserSubscription(userId));

// Testar criação de sessão
console.log(await createCheckoutSession(priceId, email));
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a documentação do Stripe: https://stripe.com/docs
2. Verifique os logs da aplicação
3. Teste com cartões de teste do Stripe
4. Entre em contato com o suporte técnico

---

**Nota**: Esta integração está configurada para ambiente de desenvolvimento. Para produção, implemente as funções de backend adequadas e configure webhooks reais.