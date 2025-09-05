import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT-GUEST] ${step}${detailsStr}`);
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
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing STRIPE_SECRET_KEY" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      logStep("Missing Supabase env vars");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing Supabase service credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabaseService = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const {
      email,
      companyName,
      phoneNumber,
      password,
      planId,
      billingType,
    } = body as {
      email?: string;
      companyName?: string;
      phoneNumber?: string; // numbers only expected
      password?: string;
      planId?: string;
      billingType?: string;
    };

    // Basic validation
    const missing: string[] = [];
    if (!email) missing.push("email");
    if (!companyName) missing.push("companyName");
    if (!phoneNumber) missing.push("phoneNumber");
    if (!password) missing.push("password");

    if (missing.length > 0) {
      logStep("Missing required fields", { missing });
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Normalize and apply fallbacks
    let effectivePlanId = (planId?.replace(/_/g, '-') || 'start-quantico') as 'start-quantico' | 'vortex-neural' | 'nexus-infinito';
    let effectiveBillingType: 'monthly' | 'yearly' = billingType === 'yearly' ? 'yearly' : 'monthly';
    logStep("Request data received", { email, companyName, effectivePlanId, effectiveBillingType });

    // Price IDs mapping (same as create-checkout)
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
    } as const;

    let priceIds = STRIPE_PRICE_IDS[effectivePlanId];
    if (!priceIds) {
      logStep("Invalid plan, applying fallback to start-quantico", { requested: planId });
      effectivePlanId = 'start-quantico';
      priceIds = STRIPE_PRICE_IDS['start-quantico'];
    }

    let priceId = priceIds[effectiveBillingType];
    if (!priceId) {
      logStep("Invalid billing type, applying fallback to monthly", { requested: billingType });
      effectiveBillingType = 'monthly';
      priceId = priceIds['monthly'];
    }
    logStep("Price ID resolved", { priceId, planId: effectivePlanId, billingType: effectiveBillingType });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Try to reuse existing customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;
    if (customerId) {
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found");
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/create-account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancel`,
      metadata: {
        planId: effectivePlanId,
        billingType: effectiveBillingType,
        email,
      },
      subscription_data: {
        metadata: {
          planId: effectivePlanId,
          billingType: effectiveBillingType,
          email,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Persist checkout session details for later account creation
    const { error: insertError } = await supabaseService
      .from('checkout_sessions')
      .insert({
        stripe_session_id: session.id,
        email,
        company_name: companyName,
        phone_number: phoneNumber,
        password_hash: password, // temporarily store plain password for account creation
        plan_id: effectivePlanId,
        billing_type: effectiveBillingType,
        status: 'pending'
      });

    if (insertError) {
      logStep("Error inserting checkout session", insertError);
      return new Response(
        JSON.stringify({ error: `Failed to store checkout session: ${insertError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout-guest", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});