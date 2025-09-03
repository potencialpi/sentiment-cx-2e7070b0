
// import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { assignPlanWithAudit, checkPlanConsistency } from './planAudit';

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
export async function handleStripeWebhook(event: StripeEvent, sbOverride?: SupabaseClient<Database>) {
  console.log('Processando evento do Stripe:', event.type);

  // Evita importar o client do browser em ambiente server (Node)
  const sb: SupabaseClient<Database> = sbOverride
    ? sbOverride
    : (await import('@/integrations/supabase/client')).supabase as unknown as SupabaseClient<Database>;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as CheckoutSession, sb);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, sb);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, sb);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object, sb);
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
async function handleCheckoutCompleted(session: CheckoutSession, sb: SupabaseClient<Database>) {
  // Acessa campos potencialmente ausentes de forma defensiva
  const { customer_email, metadata } = session;
  const amount_total = (session as any).amount_total as number | undefined;
  const currency = (session as any).currency as string | undefined;

  if (!customer_email) {
    console.error('Email do cliente não encontrado na sessão');
    return;
  }

  try {
    // Buscar usuário pelo email
    const { data: user, error: userError } = await sb
      .from('profiles')
      .select('*')
      .eq('email', customer_email)
      .single();

    if (userError || !user) {
      console.error('Usuário não encontrado:', customer_email);
      return;
    }

    // Preferir metadados do Stripe, mas fazer fallback para checkout_sessions
    let planCode = metadata?.planType as string | undefined;
    let billingType = metadata?.billingType as string | undefined;

    // Preparar valores de amount/currency da transação
    let amountCents: number | null = typeof amount_total === 'number' ? amount_total : null;
    let txnCurrency: string | null = currency ? currency.toLowerCase() : null;

    if (!planCode || !billingType || amountCents == null || !txnCurrency) {
      console.warn('Dados ausentes no evento. Buscando fallback em checkout_sessions...', { planCode, billingType, amountCents, txnCurrency, sessionId: session.id });
      const { data: cs, error: csError } = await sb
        .from('checkout_sessions')
        .select('plan_id, billing_type, amount, currency')
        .eq('stripe_session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (csError) {
        console.warn('Falha ao buscar fallback em checkout_sessions:', csError);
      } else if (cs) {
        if (!planCode) planCode = cs.plan_id;
        if (!billingType) billingType = cs.billing_type;
        if (amountCents == null && typeof cs.amount === 'number') amountCents = cs.amount;
        if (!txnCurrency && cs.currency) txnCurrency = cs.currency.toLowerCase();
        // Opcionalmente, marcar a sessão como concluída
        await sb
          .from('checkout_sessions')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('stripe_session_id', session.id);
      }
    }

    // VALIDAÇÃO CRÍTICA: Não permitir processamento sem plano válido
    if (!planCode) {
      console.error('ERRO CRÍTICO: Plano não identificado na sessão de checkout', {
        sessionId: session.id,
        customerEmail: customer_email,
        metadata: session.metadata,
        subscription: (session as any).subscription
      });
      throw new Error('Plano não identificado - processamento de pagamento cancelado');
    }
    
    // Validar se o plano é válido
    const validPlans = ['start-quantico', 'vortex-neural', 'nexus-infinito'];
    if (!validPlans.includes(planCode)) {
      console.error('ERRO CRÍTICO: Plano inválido identificado', {
        planCode,
        sessionId: session.id,
        customerEmail: customer_email
      });
      throw new Error(`Plano inválido: ${planCode} - processamento cancelado`);
    }
    
    billingType = billingType || 'monthly';
    amountCents = amountCents ?? 0;
    txnCurrency = txnCurrency || 'brl';
    
    console.log('✅ VALIDAÇÃO DE PLANO APROVADA', {
      planCode,
      billingType,
      customerEmail: customer_email,
      sessionId: session.id
    });

    // Usar sistema de auditoria para atribuir plano com segurança
    try {
      await assignPlanWithAudit(
        sb,
        user.id,
        planCode,
        'webhook',
        session.id,
        {
          stripe_session_id: session.id,
          customer_email: customer_email,
          billing_type: billingType,
          amount_cents: amountCents,
          currency: txnCurrency,
          subscription_id: (session as any).subscription
        }
      );

      // Atualizar status de assinatura
      const { error: updateError } = await sb
        .from('profiles')
        .update({
          subscription_status: 'active',
          billing_type: billingType,
          subscription_id: (session as any).subscription,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Erro ao atualizar status de assinatura:', updateError);
      }

      // Verificar consistência após atribuição
      const consistencyCheck = await checkPlanConsistency(sb, user.id);
      if (!consistencyCheck.consistent) {
        console.error('⚠️ INCONSISTÊNCIA DETECTADA APÓS ATRIBUIÇÃO DE PLANO:', consistencyCheck.details);
      }

    } catch (auditError) {
      console.error('ERRO CRÍTICO NA ATRIBUIÇÃO DE PLANO COM AUDITORIA:', auditError);
      throw auditError; // Falhar o processo se não conseguir atribuir com segurança
    }

    // Registrar transação
    const { error: transactionError } = await sb
      .from('transactions')
      .insert({
        user_id: user.id,
        stripe_session_id: session.id,
        amount: amountCents / 100, // Converter de centavos
        currency: txnCurrency,
        status: 'completed',
        plan_type: planCode,
        billing_type: billingType,
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
async function handlePaymentSucceeded(invoice: any, sb: SupabaseClient<Database>) {
  const { customer_email } = invoice;
  
  if (!customer_email) {
    console.error('Email do cliente não encontrado na fatura');
    return;
  }

  try {
    // Atualizar status da assinatura
    const { error } = await sb
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
async function handlePaymentFailed(invoice: any, sb: SupabaseClient<Database>) {
  const { customer_email } = invoice;
  
  if (!customer_email) {
    console.error('Email do cliente não encontrado na fatura');
    return;
  }

  try {
    // Atualizar status para pagamento pendente
    const { error } = await sb
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
async function handleSubscriptionCanceled(subscription: any, sb: SupabaseClient<Database>) {
  try {
    // Buscar usuário pela subscription_id
    const { data: user, error: userError } = await sb
      .from('profiles')
      .select('*')
      .eq('subscription_id', subscription.id)
      .single();

    if (userError || !user) {
      console.error('Usuário não encontrado para a assinatura:', subscription.id);
      return;
    }

    // Atualizar status para cancelado
    const { error } = await sb
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
export async function checkUserSubscription(userId: string, sbOverride?: SupabaseClient<Database>) {
  try {
    const sb: SupabaseClient<Database> = sbOverride
      ? sbOverride
      : (await import('@/integrations/supabase/client')).supabase as unknown as SupabaseClient<Database>;

    const { data: user, error } = await sb
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
