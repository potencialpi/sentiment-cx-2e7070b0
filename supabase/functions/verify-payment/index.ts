import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.12.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Missing sessionId");
    logStep("Session ID received", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });
    logStep("Session retrieved", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email 
    });

    if (session.payment_status === 'paid' && session.subscription) {
      const subscription = session.subscription as Stripe.Subscription;
      const customerEmail = session.customer_details?.email;
      const planId = session.metadata?.planId;
      const billingType = session.metadata?.billingType;

      if (!customerEmail || !planId || !billingType) {
        throw new Error("Missing required metadata from session");
      }

      // Buscar o usuário pelo email, já que ele acabou de ser criado
      const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
      if (userError) {
        throw new Error(`Failed to fetch users: ${userError.message}`);
      }

      const user = userData.users.find(u => u.email === customerEmail);
      if (!user) {
        throw new Error(`User not found with email: ${customerEmail}`);
      }

      const userId = user.id;

      logStep("Payment verified, updating database", {
        customerEmail,
        planId,
        billingType,
        userId,
        subscriptionId: subscription.id
      });

      // Determine subscription tier
      let subscriptionTier = "Basic";
      if (planId === 'vortex-neural') {
        subscriptionTier = "Premium";
      } else if (planId === 'nexus-infinito') {
        subscriptionTier = "Enterprise";
      }

      const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

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
          subscription_id: subscription.id,
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
          stripe_session_id: sessionId,
          amount: session.amount_total / 100, // Convert from cents
          currency: session.currency,
          status: 'completed',
          plan_type: subscriptionTier,
          billing_type: billingType,
          metadata: {
            planId,
            subscriptionId: subscription.id,
            customerId: session.customer
          }
        });

      if (transactionError) {
        logStep("Error recording transaction", { error: transactionError });
        // Not critical, don't throw
      }

      logStep("Database updated successfully");

      return new Response(JSON.stringify({
        success: true,
        planId,
        subscriptionTier,
        billingType,
        subscriptionEnd
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: "Payment not confirmed or subscription not found"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});