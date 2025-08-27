import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function logStep(step: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${step}:`, data || "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("STRIPE_SECRET_KEY not found");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Stripe key verified", { keyExists: !!stripeKey, keyLength: stripeKey.length });

    const body = await req.json();
    logStep("Request body parsed", body);
    
    const { couponCode } = body;
    if (!couponCode) {
      logStep("No coupon code provided");
      throw new Error("Coupon code is required");
    }
    logStep("Coupon code received", { couponCode });

    // Import Stripe dynamically to avoid potential import issues
    const { default: Stripe } = await import("https://esm.sh/stripe@14.25.0");
    logStep("Stripe imported successfully");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe client created");

    // Normalize and clean code
    const cleanCode = couponCode.trim().replace(/\s+/g, '');

    try {
      // Try to retrieve as promotion code first, then as direct coupon if not found
      let coupon: any = null;
      let promotionCode: any = null;

      logStep("Trying to retrieve as promotion code", { couponCode: cleanCode });
      const promotionCodes = await stripe.promotionCodes.list({
        code: cleanCode,
        limit: 1
      });

      if (promotionCodes.data.length > 0) {
        promotionCode = promotionCodes.data[0];
        logStep("Promotion code lookup result", { id: promotionCode.id, active: promotionCode.active });
        if (promotionCode && promotionCode.active) {
          coupon = await stripe.coupons.retrieve(promotionCode.coupon as string);
          logStep("Promotion code found and coupon retrieved", { 
            promotionCodeId: promotionCode.id,
            couponId: coupon.id,
            active: promotionCode.active
          });
        }
      }

      // If no active promotion code found, try direct coupon retrieval
      if (!coupon) {
        try {
          logStep("Trying to retrieve as direct coupon", { couponCode: cleanCode });
          coupon = await stripe.coupons.retrieve(cleanCode);
          logStep("Direct coupon found", { id: coupon.id });
        } catch (couponError: any) {
          logStep("Direct coupon lookup failed", { error: couponError.message });
        }
      }

      if (!coupon) {
        logStep("No coupon found");
        return new Response(JSON.stringify({ 
          valid: false, 
          error: "Cupom não encontrado" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Coupon details", { 
        id: coupon.id, 
        valid: coupon.valid,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        currency: coupon.currency
      });

      if (!coupon.valid) {
        return new Response(JSON.stringify({
          valid: false,
          error: "Cupom inválido ou expirado"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const description = coupon.percent_off 
        ? `${cleanCode} - ${coupon.percent_off}% Desconto`
        : `${cleanCode} - R$ ${((coupon.amount_off || 0) / 100).toFixed(2)} Desconto`;

      return new Response(JSON.stringify({
        valid: true,
        couponId: coupon.id,
        couponCode: cleanCode,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        currency: coupon.currency,
        description: description
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError: any) {
      logStep("DETAILED Stripe error", { 
        error: stripeError.message,
        code: stripeError.code,
        type: stripeError.type,
        statusCode: stripeError.statusCode,
        stack: stripeError.stack
      });
      
      if (stripeError.code === 'resource_missing') {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: "Cupom não encontrado" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Return 200 with error info instead of 500
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Erro ao validar cupom com Stripe",
        debug: stripeError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("DETAILED ERROR in validate-coupon", { 
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    // Return 200 with error info instead of 500 to avoid "non-2xx status code" error
    return new Response(JSON.stringify({ 
      valid: false, 
      error: "Erro interno ao validar cupom",
      debug: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Changed from 500 to 200
    });
  }
});