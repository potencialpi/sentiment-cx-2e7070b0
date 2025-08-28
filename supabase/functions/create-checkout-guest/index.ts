import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use a compatible Stripe version
import Stripe from "https://esm.sh/stripe@15.12.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    
    // Initialize Stripe with explicit API version to override environment variable
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16', // Explicitly set valid API version
    });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logStep("Supabase client initialized");

    // Calculate price based on plan and billing type
    const planPrices: Record<string, Record<string, number>> = {
      "start-quantico": { "monthly": 34900, "yearly": 349900 },
      "vortex-neural": { "monthly": 64900, "yearly": 619900 },
<<<<<<< HEAD
      "nexus-infinito": { "monthly": 124900, "yearly": 1189900 },
      "nexus": { "monthly": 124900, "yearly": 1189900 },
      "basic": { "monthly": 34900, "yearly": 349900 },
      "pro": { "monthly": 64900, "yearly": 619900 },
      "enterprise": { "monthly": 124900, "yearly": 1189900 }
=======
      "nexus-infinito": { "monthly": 124900, "yearly": 1189900 }
>>>>>>> 9761bc3 (Supabase Edge Functions: ajustes em URLs com esquema, validação de planos e alinhamento com v1)
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

    logStep("Using Stripe REST API directly");

    // Validate coupon if provided using Stripe directly (promotion code or coupon)
    let couponData: { type: 'promotion_code' | 'coupon'; id: string } | null = null;
    let finalAmount = price;

    if (couponCode) {
      logStep("Validating coupon with Stripe", { couponCode });

      try {
        // First, attempt to find an active promotion code by code
        const promotionCodes = await stripe.promotionCodes.list({ code: couponCode, limit: 1 });
        const promo = promotionCodes.data[0];

        if (promo && promo.active && promo.coupon) {
          // Compute discount from the underlying coupon
          const c = promo.coupon as any;
          if (c.percent_off) {
            finalAmount = Math.round(price * (1 - c.percent_off / 100));
          } else if (c.amount_off) {
            finalAmount = Math.max(0, price - c.amount_off);
          }
          couponData = { type: 'promotion_code', id: promo.id };
          logStep("Promotion code applied", { promotion_code: promo.id, finalAmount });
        } else {
          // If no promotion code, try direct coupon retrieval (by id or code)
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
              logStep("Coupon exists but not valid", { couponCode });
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

    // Create checkout session using Stripe SDK
    logStep("Creating checkout session", { finalAmount, couponCode });
    
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'Sentiment Analysis Report',
          },
          unit_amount: finalAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || 'https://sentiment-cx.vercel.app'}/create-account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || 'https://sentiment-cx.vercel.app'}/payment-cancel`,
       metadata: {
        user_email: email,
        original_amount: price.toString(),
        final_amount: finalAmount.toString(),
        planId,
        billingType
      }
    };
    
    if (couponData) {
      sessionParams.discounts = [
        couponData.type === 'promotion_code'
          ? { promotion_code: couponData.id }
          : { coupon: couponData.id }
      ];
    }
    
    const session = await stripe.checkout.sessions.create(sessionParams);

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

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout-guest", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});