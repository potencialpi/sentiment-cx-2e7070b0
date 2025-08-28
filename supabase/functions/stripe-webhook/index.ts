import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    
    logStep("Environment variables verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook event constructed", { type: event.type, id: event.id });
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err });
      return new Response(`Webhook Error: ${err}`, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { sessionId: session.id });
        
        if (session.payment_status === 'paid') {
          await handleSuccessfulPayment(session, supabaseClient, stripe);
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_succeeded", { invoiceId: invoice.id });
        
        if (invoice.subscription) {
          await handleSubscriptionPayment(invoice, supabaseClient, stripe);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.updated", { subscriptionId: subscription.id });
        
        await handleSubscriptionUpdate(subscription, supabaseClient);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });
        
        await handleSubscriptionCancellation(subscription, supabaseClient);
        break;
      }
      
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSuccessfulPayment(
  session: Stripe.Checkout.Session,
  supabaseClient: any,
  stripe: Stripe
) {
  try {
    const customerEmail = session.customer_details?.email;
    const planId = session.metadata?.planId;
    const billingType = session.metadata?.billingType;
    const userId = session.metadata?.userId;

    if (!customerEmail || !planId || !billingType || !userId) {
      throw new Error("Missing required metadata from session");
    }

    logStep("Processing successful payment", {
      customerEmail,
      planId,
      billingType,
      userId,
      sessionId: session.id
    });

    // Determine subscription tier
    let subscriptionTier = "Basic";
    if (planId === 'vortex-neural') {
      subscriptionTier = "Premium";
    } else if (planId === 'nexus-infinito') {
      subscriptionTier = "Enterprise";
    }

    let subscriptionId = null;
    let subscriptionEnd = null;

    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      subscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    } else if (billingType === 'yearly') {
      // For yearly payments, set end date to 1 year from now
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      subscriptionEnd = endDate.toISOString();
    }

    // Update subscribers table
    const { error: subscriberError } = await supabaseClient
      .from("subscribers")
      .upsert({
        email: customerEmail,
        user_id: userId,
        stripe_customer_id: session.customer,
        subscribed: true,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (subscriberError) {
      logStep("Error updating subscribers table", { error: subscriberError });
      throw new Error(`Failed to update subscribers: ${subscriberError.message}`);
    }

    // Update profiles table
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        plan_name: planId,
        subscription_status: 'active',
        plan_type: subscriptionTier,
        billing_type: billingType,
        subscription_id: subscriptionId,
        stripe_customer_id: session.customer,
        status: 'active'
      })
      .eq('user_id', userId);

    if (profileError) {
      logStep("Error updating profiles table", { error: profileError });
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    // Record transaction
    const { error: transactionError } = await supabaseClient
      .from("transactions")
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        amount: (session.amount_total || 0) / 100, // Convert from cents
        currency: session.currency,
        status: 'completed',
        plan_type: subscriptionTier,
        billing_type: billingType,
        metadata: {
          planId,
          subscriptionId,
          customerId: session.customer
        }
      });

    if (transactionError) {
      logStep("Error recording transaction", { error: transactionError });
      // Not critical, don't throw
    }

    logStep("Payment processed successfully", { userId, planId, subscriptionTier });
    
  } catch (error) {
    logStep("Error in handleSuccessfulPayment", { error });
    throw error;
  }
}

async function handleSubscriptionPayment(
  invoice: Stripe.Invoice,
  supabaseClient: any,
  stripe: Stripe
) {
  try {
    if (!invoice.subscription) return;
    
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!customer || customer.deleted) {
      throw new Error("Customer not found or deleted");
    }
    
    const customerEmail = (customer as Stripe.Customer).email;
    if (!customerEmail) {
      throw new Error("Customer email not found");
    }

    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

    // Update subscription end date
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', subscription.customer);

    if (profileError) {
      logStep("Error updating profile for subscription payment", { error: profileError });
    }

    // Update subscribers table
    const { error: subscriberError } = await supabaseClient
      .from("subscribers")
      .update({
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', subscription.customer);

    if (subscriberError) {
      logStep("Error updating subscriber for subscription payment", { error: subscriberError });
    }

    logStep("Subscription payment processed", { subscriptionId: subscription.id });
    
  } catch (error) {
    logStep("Error in handleSubscriptionPayment", { error });
    throw error;
  }
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabaseClient: any
) {
  try {
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const status = subscription.status === 'active' ? 'active' : 'inactive';

    // Update profiles table
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        subscription_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription.id);

    if (profileError) {
      logStep("Error updating profile for subscription update", { error: profileError });
    }

    // Update subscribers table
    const { error: subscriberError } = await supabaseClient
      .from("subscribers")
      .update({
        subscribed: subscription.status === 'active',
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', subscription.customer);

    if (subscriberError) {
      logStep("Error updating subscriber for subscription update", { error: subscriberError });
    }

    logStep("Subscription update processed", { subscriptionId: subscription.id, status });
    
  } catch (error) {
    logStep("Error in handleSubscriptionUpdate", { error });
    throw error;
  }
}

async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription,
  supabaseClient: any
) {
  try {
    // Update profiles table
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription.id);

    if (profileError) {
      logStep("Error updating profile for subscription cancellation", { error: profileError });
    }

    // Update subscribers table
    const { error: subscriberError } = await supabaseClient
      .from("subscribers")
      .update({
        subscribed: false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', subscription.customer);

    if (subscriberError) {
      logStep("Error updating subscriber for subscription cancellation", { error: subscriberError });
    }

    logStep("Subscription cancellation processed", { subscriptionId: subscription.id });
    
  } catch (error) {
    logStep("Error in handleSubscriptionCancellation", { error });
    throw error;
  }
}