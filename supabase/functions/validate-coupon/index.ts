import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-COUPON] ${step}${detailsStr}`);
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

    const { couponCode } = await req.json();
    if (!couponCode) throw new Error("Coupon code is required");
    logStep("Coupon code received", { couponCode });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18" });

    try {
      // First try to retrieve as promotion code, then as coupon
      let coupon;
      let promotionCode;
      
      try {
        // Try as promotion code first
        promotionCode = await stripe.promotionCodes.retrieve(couponCode);
        if (promotionCode && promotionCode.active) {
          coupon = await stripe.coupons.retrieve(promotionCode.coupon as string);
          logStep("Promotion code found", { 
            id: promotionCode.id, 
            couponId: coupon.id,
            active: promotionCode.active
          });
        }
      } catch (promoError) {
        // If not a promotion code, try as direct coupon code
        try {
          coupon = await stripe.coupons.retrieve(couponCode);
          logStep("Direct coupon found", { id: coupon.id });
        } catch (couponError) {
          throw couponError;
        }
      }

      if (!coupon) {
        throw new Error("Coupon not found");
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
          error: "Cupom expirado ou inválido" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check if promotion code has usage limits
      if (promotionCode && promotionCode.restrictions?.first_time_transaction && promotionCode.times_redeemed >= (promotionCode.max_redemptions || 1)) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: "Cupom já foi utilizado o número máximo de vezes" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Calculate discount information
      const discountInfo = {
        valid: true,
        couponId: promotionCode ? promotionCode.code : coupon.id,
        couponCode: couponCode,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        currency: coupon.currency,
        description: coupon.name || `Desconto de ${coupon.percent_off ? `${coupon.percent_off}%` : `R$ ${(coupon.amount_off || 0) / 100}`}`
      };

      logStep("Coupon validation successful", discountInfo);

      return new Response(JSON.stringify(discountInfo), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError: any) {
      logStep("Stripe error", { error: stripeError.message });
      
      if (stripeError.code === 'resource_missing') {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: "Cupom não encontrado" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      throw stripeError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in validate-coupon", { message: errorMessage });
    return new Response(JSON.stringify({ 
      valid: false, 
      error: "Erro ao validar cupom" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});