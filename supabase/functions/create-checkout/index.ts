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
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    // DEBUG: Verificar se está usando chave de teste
    logStep("Stripe key verified", { 
      keyPrefix: stripeKey.substring(0, 12),
      isTestKey: stripeKey.startsWith('sk_test_'),
      isLiveKey: stripeKey.startsWith('sk_live_')
    });

    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { planId, billingType } = await req.json();
    if (!planId || !billingType) throw new Error("Missing planId or billingType");
    logStep("Request data received", { planId, billingType });

    // Price IDs mapping
    const STRIPE_PRICE_IDS = {
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

    const priceIds = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];
    if (!priceIds) throw new Error(`Invalid plan: ${planId}`);
    
    const priceId = priceIds[billingType as 'monthly' | 'yearly'];
    if (!priceId) throw new Error(`Invalid billing type: ${billingType}`);
    logStep("Price ID resolved", { priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancel`,
      metadata: {
        planId: planId,
        billingType: billingType,
        userId: user.id
      },
      subscription_data: {
        metadata: {
          planId: planId,
          billingType: billingType,
          userId: user.id
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});