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
      "start-quantico": { "monthly": 34900, "yearly": 349900 },
      "vortex-neural": { "monthly": 64900, "yearly": 619900 },
      "nexus-infinito": { "monthly": 124900, "yearly": 1189900 }
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

    // Initialize Stripe with explicit API version (same as v1)
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Helper to normalize the base URL ensuring a scheme is present
    const getBaseUrl = () => {
      const raw = (Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || 'https://sentiment-cx.vercel.app').trim();
      // Ensure scheme for production URLs
      if (!/^https?:\/\//i.test(raw)) {
        return `https://${raw}`;
      }
      return raw;
    };

    // Validate coupon if provided  
    // Validate coupon (promotion code or direct coupon)
    let couponData: { type: 'promotion_code' | 'coupon'; id: string } | null = null;
    let finalAmount = price;
  
    if (couponCode) {
      logStep("Validating coupon with Stripe", { couponCode });
      try {
        const promotionCodes = await stripe.promotionCodes.list({ code: couponCode, limit: 1 });
        const promo = promotionCodes.data[0];
        if (promo && promo.active && promo.coupon) {
          const c: any = promo.coupon;
          if (c.percent_off) {
            finalAmount = Math.round(price * (1 - c.percent_off / 100));
          } else if (c.amount_off) {
            finalAmount = Math.max(0, price - c.amount_off);
          }
          couponData = { type: 'promotion_code', id: promo.id };
          logStep("Promotion code applied", { promotion_code: promo.id, finalAmount });
        } else {
          try {
            const directCoupon = await stripe.coupons.retrieve(couponCode);
            if (directCoupon && directCoupon.valid) {
              if (directCoupon.percent_off) {
                finalAmount = Math.round(price * (1 - directCoupon.percent_off / 100));
              } else if (directCoupon.amount_off) {
                finalAmount = Math.max(0, price - directCoupon.amount_off);
              }
              couponData = { type: 'coupon', id: directCoupon.id };
              logStep("Direct coupon applied", { coupon: directCoupon.id, finalAmount });
            } else {
              return new Response(
                JSON.stringify({ error: "Invalid coupon code" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } catch (e) {
            logStep("No promotion code or direct coupon found", { couponCode, error: (e as Error).message });
            return new Response(
              JSON.stringify({ error: "Invalid coupon code" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (error: any) {
        logStep("Coupon validation error (Stripe)", { error: error.message });
        return new Response(
          JSON.stringify({ error: "Invalid coupon code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create Stripe checkout session
    logStep("Creating Stripe checkout session");
    const baseUrl = getBaseUrl();
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
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment-cancel`,
      customer_email: email,
      discounts: couponData ? [
        couponData.type === 'promotion_code' ? { promotion_code: couponData.id } : { coupon: couponData.id }
      ] : undefined,
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
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});