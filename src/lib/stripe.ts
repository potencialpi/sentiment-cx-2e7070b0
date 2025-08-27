
import { loadStripe } from '@stripe/stripe-js';

// Inicializar Stripe com a chave pública do ambiente
const stripePublishableKey = "pk_live_51RlEL3BN5utVkHFQm7z5lJg7jtbHjJlHhY6wqUdq3LmbY5EcAYhL0tZ0F6KLZDLhZ0F6KLZDLhZ0F6KLZDLhZ0F6K";

// Criar a promise do Stripe
export const stripePromise = loadStripe(stripePublishableKey);

// Preços dos planos em centavos (BRL)
export const PLAN_PRICES = {
  'start-quantico': {
    monthly: 34900,   // R$ 349/mês
    yearly: 349900    // R$ 3.499/ano (10 meses)
  },
  'vortex-neural': {
    monthly: 64900,   // R$ 649/mês  
    yearly: 619900    // R$ 6.199/ano (9.5 meses)
  },
  'nexus-infinito': {
    monthly: 124900,  // R$ 1.249/mês
    yearly: 1189900   // R$ 11.899/ano (9.5 meses)
  }
};

// Função para obter o preço correto baseado no plano e tipo de cobrança
export const getPlanPrice = (planId: string, billingType: 'monthly' | 'yearly'): number => {
  const prices = PLAN_PRICES[planId as keyof typeof PLAN_PRICES];
  
  if (!prices) {
    throw new Error(`Plano não encontrado: ${planId}`);
  }
  
  return prices[billingType];
};

// Função para criar sessão de checkout via Edge Function
export async function createCheckoutSession(
  planId: string, 
  billingType: 'monthly' | 'yearly',
  couponCode?: string,
  customerEmail?: string
): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { 
        planId, 
        billingType,
        couponCode: couponCode || undefined
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.url) {
      throw new Error('URL de checkout não recebida');
    }

    return data.url;
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    throw new Error('Falha ao criar sessão de pagamento');
  }
}
