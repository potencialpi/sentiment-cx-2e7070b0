import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.4.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

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
    logStep("Stripe key verified");

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

    const { planId, billingType, couponCode } = await req.json();
    if (!planId || !billingType) throw new Error("Missing planId or billingType");
    logStep("Request data received", { planId, billingType, couponCode });

    // Calculate price based on plan and billing type (using same logic as create-checkout-guest)
    const planPrices = {
      'start-quantico': { monthly: 34900, yearly: 349900 }, // R$ 349/mês, R$ 3.499/ano
      'vortex-neural': { monthly: 64900, yearly: 619900 },  // R$ 649/mês, R$ 6.199/ano
      'nexus-infinito': { monthly: 124900, yearly: 1189900 } // R$ 1.249/mês, R$ 11.899/ano
    };

    const price = planPrices[planId as keyof typeof planPrices]?.[billingType as 'monthly' | 'yearly'];
    if (!price) {
      throw new Error("Invalid plan or billing type");
    }

    logStep("Price calculated", { planId, billingType, price });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18" });
    
    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found");
    }

    const baseUrl = Deno.env.get('FRONTEND_URL') || req.headers.get("origin") || "https://sentiment-cx.vercel.app";
    
    // Validate coupon if provided
    let discounts = undefined;
    if (couponCode) {
      try {
        // Try as promotion code first, then as direct coupon
        try {
          const promotionCode = await stripe.promotionCodes.retrieve(couponCode);
          if (promotionCode && promotionCode.active) {
            discounts = [{ promotion_code: promotionCode.id }];
            logStep("Promotion code applied", { promotionId: promotionCode.id });
          }
        } catch (promoError) {
          // Try as direct coupon
          const coupon = await stripe.coupons.retrieve(couponCode);
          if (coupon.valid) {
            discounts = [{ coupon: coupon.id }];
            logStep("Direct coupon applied", { couponId: coupon.id });
          }
        }
        
        if (!discounts) {
          logStep("No valid coupon found", { couponCode });
        }
      } catch (error) {
        logStep("Coupon validation failed", { couponCode, error });
        // Continue without coupon rather than failing the entire checkout
      }
    }
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      locale: 'pt-BR',
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: { 
              name: `${planId === 'start-quantico' ? 'Start Quântico' : planId === 'vortex-neural' ? 'Vortex Neural' : 'Nexus Infinito'} - ${billingType === 'monthly' ? 'Mensal' : 'Anual'}` 
            },
            unit_amount: price,
            ...(billingType === 'yearly' ? {} : { recurring: { interval: "month" } })
          },
          quantity: 1,
        },
      ],
      mode: billingType === 'yearly' ? "payment" : "subscription",
      discounts,
      success_url: `${baseUrl}/welcome-login?session_id={CHECKOUT_SESSION_ID}&t=${Date.now()}`,
      cancel_url: `${baseUrl}/payment-cancel?t=${Date.now()}`,
      metadata: {
        planId: planId,
        billingType: billingType,
        userId: user.id,
        couponCode: couponCode || ''
      },
      ...(billingType === 'monthly' ? {
        subscription_data: {
          metadata: {
            planId: planId,
            billingType: billingType,
            userId: user.id,
            couponCode: couponCode || ''
          },
        }
      } : {})
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