import Stripe from 'stripe';

// Inicializar Stripe com a chave secreta
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-07-30.basil',
});

// Função para criar sessão de checkout
export async function createCheckoutSession(priceId: string, customerEmail?: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/payment-cancel`,
      customer_email: customerEmail,
      metadata: {
        priceId: priceId,
      },
      subscription_data: {
        metadata: {
          priceId: priceId,
        },
      },
    });

    return session.id;
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    throw new Error('Falha ao criar sessão de pagamento');
  }
}

// Função para verificar o status do pagamento
export async function verifyPayment(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (session.payment_status === 'paid') {
      return {
        success: true,
        customerId: session.customer,
        subscriptionId: session.subscription,
        planId: session.metadata?.priceId,
        customerEmail: session.customer_details?.email,
      };
    }

    return {
      success: false,
      error: 'Pagamento não confirmado',
    };
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    throw new Error('Falha na verificação do pagamento');
  }
}

// Função para lidar com webhooks do Stripe
export async function handleStripeWebhook(payload: string, signature: string) {
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('Webhook secret não configurado');
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Pagamento completado:', session.id);
        // Aqui você pode atualizar o status do usuário no banco de dados
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Pagamento de fatura bem-sucedido:', invoice.id);
        // Aqui você pode renovar a assinatura do usuário
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log('Falha no pagamento da fatura:', failedInvoice.id);
        // Aqui você pode notificar o usuário sobre a falha no pagamento
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Assinatura cancelada:', subscription.id);
        // Aqui você pode desativar o acesso do usuário
        break;

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error('Erro no webhook:', error);
    throw new Error('Falha no processamento do webhook');
  }
}

export { stripe };
