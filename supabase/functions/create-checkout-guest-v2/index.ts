import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function logStep(step: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${step}:`, data || "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Starting create-checkout-guest-v2");
    
    const { email, companyName, password, planId, billingType, couponCode, phoneNumber } = await req.json();
    
    logStep("Request data received", { email, companyName, planId, billingType, couponCode, phoneNumber });

    // Validate required fields
    if (!email || !companyName || !password || !planId || !billingType) {
      logStep("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      logStep("Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Environment variables loaded");

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logStep("Supabase client initialized");

    // Calculate price based on plan and billing type
    const planPrices: Record<string, Record<string, number>> = {
      "basic": { "monthly": 4900, "annual": 49000 },
      "pro": { "monthly": 9900, "annual": 99000 },
      "enterprise": { "monthly": 19900, "annual": 199000 }
    };

    const price = planPrices[planId]?.[billingType];
    if (!price) {
      logStep("Invalid plan or billing type", { planId, billingType });
      return new Response(
        JSON.stringify({ error: "Invalid plan or billing type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Price calculated", { planId, billingType, price });

    const stripe = new Stripe(stripeKey);

    // Validate coupon if provided  
    let couponData = null;
    let finalAmount = price;

    if (couponCode) {
      logStep("Validating coupon", { couponCode });
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon.valid) {
          couponData = coupon;
          if (coupon.percent_off) {
            finalAmount = Math.round(price * (1 - coupon.percent_off / 100));
          } else if (coupon.amount_off) {
            finalAmount = Math.max(0, price - coupon.amount_off);
          }
          logStep("Coupon applied", { originalAmount: price, finalAmount, coupon: coupon.id });
        }
      } catch (error) {
        logStep("Invalid coupon", { couponCode, error: error.message });
        return new Response(
          JSON.stringify({ error: "Invalid coupon code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create Stripe checkout session
    logStep("Creating Stripe checkout session");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Plano ${planId.charAt(0).toUpperCase() + planId.slice(1)} - ${billingType === "monthly" ? "Mensal" : "Anual"}`,
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
-      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
-      cancel_url: `${req.headers.get("origin")}/checkout`,
+      success_url: `${(() => { const o = req.headers.get("origin") || 'http://localhost:8080'; return (o.includes('localhost') || o.includes('127.0.0.1')) ? 'http://localhost:8080' : o; })()}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
+      cancel_url: `${(() => { const o = req.headers.get("origin") || 'http://localhost:8080'; return (o.includes('localhost') || o.includes('127.0.0.1')) ? 'http://localhost:8080' : o; })()}/checkout`,
      customer_email: email,
      discounts: couponData ? [{ coupon: couponData.id }] : undefined,
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Store checkout session data in Supabase
    const { error: insertError } = await supabase
      .from("checkout_sessions")
      .insert({
        stripe_session_id: session.id,
        email,
        company_name: companyName,
        password_hash: password, // In production, this should be hashed
        plan_id: planId,
        billing_type: billingType,
        amount: finalAmount,
        currency: "brl",
        status: "pending",
        phone_number: phoneNumber,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });

    if (insertError) {
      logStep("Error storing session data", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store session data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Session data stored successfully");

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Unexpected error", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});