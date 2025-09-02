
import { supabase } from '@/integrations/supabase/client';

// Tipos para eventos do Stripe
interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

interface CheckoutSession {
  id: string;
  customer_email: string;
  subscription?: string;
  metadata?: {
    planType?: string;
    billingType?: string;
    userId?: string;
  };
  amount_total: number;
  currency: string;
}

// Função para processar webhooks do Stripe
export async function handleStripeWebhook(event: StripeEvent) {
  console.log('Processando evento do Stripe:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as CheckoutSession);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;
      
      default:
        console.log(`Evento não tratado: ${event.type}`);
    }
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    throw error;
  }
}

// Processar checkout completado
async function handleCheckoutCompleted(session: CheckoutSession) {
  const { customer_email, metadata, amount_total, currency } = session;
  
  if (!customer_email) {
    console.error('Email do cliente não encontrado na sessão');
    return;
  }

  try {
    // Buscar usuário pelo email
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', customer_email)
      .single();

    if (userError || !user) {
      console.error('Usuário não encontrado:', customer_email);
      return;
    }

    // Atualizar status do usuário para ativo
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        plan_type: metadata?.planType || 'vortex-neural',
        billing_type: metadata?.billingType || 'monthly',
        subscription_id: session.subscription,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Erro ao atualizar perfil do usuário:', updateError);
      return;
    }

    // Registrar transação
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        stripe_session_id: session.id,
        amount: amount_total / 100, // Converter de centavos
        currency: currency,
        status: 'completed',
        plan_type: metadata?.planType,
        billing_type: metadata?.billingType,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('Erro ao registrar transação:', transactionError);
    }

    console.log(`Pagamento processado com sucesso para ${customer_email}`);
  } catch (error) {
    console.error('Erro ao processar checkout completado:', error);
    throw error;
  }
}

// Processar pagamento bem-sucedido (renovações)
async function handlePaymentSucceeded(invoice: any) {
  const { customer_email, subscription } = invoice;
  
  if (!customer_email) {
    console.error('Email do cliente não encontrado na fatura');
    return;
  }

  try {
    // Atualizar status da assinatura
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', customer_email);

    if (error) {
      console.error('Erro ao atualizar status da assinatura:', error);
    }

    console.log(`Renovação processada para ${customer_email}`);
  } catch (error) {
    console.error('Erro ao processar pagamento bem-sucedido:', error);
  }
}

// Processar falha no pagamento
async function handlePaymentFailed(invoice: any) {
  const { customer_email } = invoice;
  
  if (!customer_email) {
    console.error('Email do cliente não encontrado na fatura');
    return;
  }

  try {
    // Atualizar status para pagamento pendente
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('email', customer_email);

    if (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
    }

    console.log(`Falha no pagamento registrada para ${customer_email}`);
  } catch (error) {
    console.error('Erro ao processar falha no pagamento:', error);
  }
}

// Processar cancelamento de assinatura
async function handleSubscriptionCanceled(subscription: any) {
  const { customer } = subscription;
  
  try {
    // Buscar usuário pela subscription_id
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('subscription_id', subscription.id)
      .single();

    if (userError || !user) {
      console.error('Usuário não encontrado para a assinatura:', subscription.id);
      return;
    }

    // Atualizar status para cancelado
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceled',
        subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('Erro ao cancelar assinatura:', error);
    }

    console.log(`Assinatura cancelada para usuário ID: ${user.id} - Email hash: ${user.email.substring(0,3)}***`);
  } catch (error) {
    console.error('Erro ao processar cancelamento:', error);
  }
}

// Função para verificar assinatura do usuário
export async function checkUserSubscription(userId: string) {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('subscription_status, plan_type, billing_type')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao verificar assinatura:', error);
      return null;
    }

    return {
      isActive: user.subscription_status === 'active',
      status: user.subscription_status,
      planType: user.plan_type,
      billingType: user.billing_type
    };
  } catch (error) {
    console.error('Erro ao verificar assinatura do usuário:', error);
    return null;
  }
}
