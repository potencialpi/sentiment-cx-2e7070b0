import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
    if (!stripeKey) {
      logStep("Missing STRIPE_SECRET_KEY");
      return new Response(JSON.stringify({ success: false, code: "CONFIG_ERROR", error: "Server misconfiguration: missing STRIPE_SECRET_KEY" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    logStep("Stripe key verified");

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId } = await req.json().catch(() => ({ sessionId: undefined }));
    if (!sessionId) {
      logStep("Missing sessionId");
      return new Response(JSON.stringify({ success: false, code: "MISSING_SESSION_ID", error: "Session ID is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
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
      const customerEmail = session.customer_details?.email ?? undefined;
      let planId = (session.metadata?.planId as string | undefined)?.replace(/_/g, '-') as 'start-quantico' | 'vortex-neural' | 'nexus-infinito' | undefined;
      let billingType = (session.metadata?.billingType as string | undefined) as 'monthly' | 'yearly' | undefined;
      const userId = session.metadata?.userId as string | undefined;

      // Apply safe fallbacks
      if (!planId || !['start-quantico','vortex-neural','nexus-infinito'].includes(planId)) {
        logStep("Invalid/missing planId in metadata, fallback to start-quantico", { planId });
        planId = 'start-quantico';
      }
      if (billingType !== 'yearly') {
        if (billingType !== 'monthly') {
          logStep("Invalid/missing billingType in metadata, fallback to monthly", { billingType });
        }
        billingType = 'monthly';
      }
      if (!customerEmail || !userId) {
        logStep("Missing required metadata from session", { customerEmail, userId });
        return new Response(JSON.stringify({ success: false, code: "MISSING_METADATA", error: "Missing required metadata from session" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

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
        // do not abort
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
        // do not abort
      }

      // Record transaction
      const { error: transactionError } = await supabaseClient
        .from("transactions")
        .insert({
          user_id: userId,
          stripe_session_id: sessionId,
          amount: (session.amount_total || 0) / 100, // Convert from cents
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
      code: "PAYMENT_NOT_CONFIRMED",
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
      code: "UNEXPECTED_ERROR",
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});