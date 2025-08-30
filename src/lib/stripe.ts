
import { loadStripe } from '@stripe/stripe-js';

// Inicializar Stripe com a chave pública (opcional)
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Apenas criar a promise do Stripe se a chave existir
export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

// Product IDs fornecidos:
// Pulso Quântico (start-quantico) = prod_SgbjCddEEPS89f
// Vórtex Neural = prod_SgbmMFe1CKANwM
// Nexus Infinito = prod_SgbozSM0EeftSd
//
// IMPORTANTE: Você precisa obter os PRICE IDs específicos no Stripe Dashboard:
// 1. Acesse https://dashboard.stripe.com/products
// 2. Para cada produto acima, clique nele
// 3. Copie os Price IDs das opções mensais e anuais
// 4. Substitua os valores abaixo pelos Price IDs reais
export const STRIPE_PRICE_IDS = {
  'start-quantico': {
    monthly: 'price_1RlEVbBN5utVkHFQRKE6lpoF',
    yearly: 'price_1RlEVbBN5utVkHFQ7gHYz6mN'
  },
  'vortex-neural': {
    monthly: 'price_1RlEZ2BN5utVkHFQfF7tK4nA',
    yearly: 'price_1RlEZ2BN5utVkHFQ0lfV3BT3'
  },
  'nexus-infinito': {
    monthly: 'price_1RlEaiBN5utVkHFQI9vfPqDb',
    yearly: 'price_1RlEaiBN5utVkHFQyHQzmooL'
  }
};

// Função para obter o price_id correto baseado no plano e tipo de cobrança
export const getStripePriceId = (planId: string, billingType: 'monthly' | 'yearly'): string => {
  const priceIds = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];
  
  if (!priceIds) {
    throw new Error(`Plano não encontrado: ${planId}`);
  }
  
  return priceIds[billingType];
};

// Função para criar sessão de checkout
export async function createCheckoutSession(priceId: string, customerEmail?: string): Promise<string> {
  try {
    // Verificar se o Stripe está disponível
    if (!stripePromise) {
      console.warn('Stripe não está configurado - VITE_STRIPE_PUBLISHABLE_KEY não definida');
      throw new Error('Stripe não está configurado');
    }

    // Para desenvolvimento, vamos simular a criação da sessão
    // Em produção, isso deve ser feito no backend
    const sessionData = {
      priceId,
      customerEmail,
      successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/payment-cancel`,
    };

    // Simular uma resposta de sessão do Stripe
    // Em produção, substitua por uma chamada real para seu backend
    const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Criando sessão de checkout:', sessionData);
    return mockSessionId;
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    throw new Error('Falha ao criar sessão de pagamento');
  }
}
