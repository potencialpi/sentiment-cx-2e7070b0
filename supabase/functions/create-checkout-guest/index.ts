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
      "nexus-infinito": { "monthly": 124900, "yearly": 1189900 },
      "nexus": { "monthly": 124900, "yearly": 1189900 },
      "basic": { "monthly": 34900, "yearly": 349900 },
      "pro": { "monthly": 64900, "yearly": 619900 },
      "enterprise": { "monthly": 124900, "yearly": 1189900 }
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

    // Validate coupon if provided using the validate-coupon function
    let couponData = null;
    let finalAmount = price;

    if (couponCode) {
      logStep("Validating coupon", { couponCode });
      
      try {
        // Use the validate-coupon function internally
        const couponResponse = await fetch(`${supabaseUrl}/functions/v1/validate-coupon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ couponCode })
        });
        
        if (!couponResponse.ok) {
          logStep("Coupon validation failed", { status: couponResponse.status });
          return new Response(
            JSON.stringify({ error: "Invalid coupon code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const couponResult = await couponResponse.json();
        
        if (!couponResult.valid) {
          logStep("Coupon is not valid", couponResult);
          return new Response(
            JSON.stringify({ error: "Invalid coupon code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Apply discount
        if (couponResult.percentOff) {
          finalAmount = Math.round(price * (1 - couponResult.percentOff / 100));
        } else if (couponResult.amountOff) {
          finalAmount = Math.max(0, price - couponResult.amountOff);
        }
        
        // Store coupon data for Stripe session
        couponData = {
          id: couponResult.couponId,
          percent_off: couponResult.percentOff,
          amount_off: couponResult.amountOff
        };
        
        logStep("Coupon applied", { originalAmount: price, finalAmount, coupon: couponData.id });
      } catch (error: any) {
        logStep("Coupon validation error", { error: error.message });
        return new Response(
          JSON.stringify({ error: "Invalid coupon code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create checkout session using Stripe SDK
    logStep("Creating checkout session", { finalAmount, couponCode });
    
    const sessionParams = {
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
      success_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:8080'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:8080'}/checkout`,
      metadata: {
        user_email: email,
        original_amount: price.toString(),
        final_amount: finalAmount.toString()
      }
    };
    
    if (couponData) {
      sessionParams.discounts = [{ coupon: couponData.id }];
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