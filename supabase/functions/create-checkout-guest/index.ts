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
  console.log(`[CREATE-CHECKOUT-GUEST] ${step}${detailsStr}`);
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

    // Use service role key to write to checkout_sessions table
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { email, companyName, phoneNumber, password, planId, billingType, couponCode } = await req.json();
    logStep("Request data received", { email, companyName, phoneNumber, planId, billingType, couponCode });

    if (!email || !companyName || !phoneNumber || !password || !planId || !billingType) {
      throw new Error("Missing required fields");
    }

    // Calculate price based on plan and billing type
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      phone_number_collection: {
        enabled: true,
      },
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
      success_url: `${req.headers.get("origin")}/create-account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancel`,
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Hash password using built-in crypto
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store checkout session data temporarily
    const { error: insertError } = await supabaseService
      .from('checkout_sessions')
      .insert({
        stripe_session_id: session.id,
        email,
        company_name: companyName,
        phone_number: phoneNumber,
        password_hash: passwordHash,
        plan_id: planId,
        billing_type: billingType,
        amount: price,
        currency: 'BRL',
        status: 'pending'
      });

    if (insertError) {
      logStep("Error storing checkout session", insertError);
      throw new Error(`Failed to store checkout session: ${insertError.message}`);
    }

    logStep("Checkout session stored successfully");

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