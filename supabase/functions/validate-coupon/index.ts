import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Use a compatible Stripe version
import Stripe from "https://esm.sh/stripe@15.12.0";

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
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Stripe key verified");

    const { couponCode } = await req.json();
    
    // Clean and validate coupon code - remove spaces and trim
    const cleanCouponCode = couponCode?.toString().trim().replace(/\s+/g, '');
    if (!cleanCouponCode) {
      throw new Error("Coupon code is required");
    }
    
    logStep("Coupon code received", { original: couponCode, cleaned: cleanCouponCode });

    // Initialize Stripe with explicit API version
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    let coupon: any = null;
    let promotionCode: any = null;

    try {
      // First try as promotion code (promo_xxxxxxx format)
      try {
        promotionCode = await stripe.promotionCodes.retrieve(cleanCouponCode);
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
          coupon = await stripe.coupons.retrieve(cleanCouponCode);
          logStep("Direct coupon found", { id: coupon.id });
        } catch (couponError) {
          logStep("Stripe error", { error: couponError.message });
          throw new Error(`No such coupon: '${cleanCouponCode}'`);
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
          error: "Coupon is not valid"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Coupon validation successful", { 
        valid: true, 
        couponId: coupon.id, 
        couponCode: cleanCouponCode,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        currency: coupon.currency,
        description: `${cleanCouponCode} - ${coupon.percent_off ? `${coupon.percent_off}% Desconto` : `R$ ${((coupon.amount_off || 0) / 100).toFixed(2)} Desconto`}`
      });

      return new Response(JSON.stringify({
        valid: true,
        couponId: coupon.id,
        couponCode: cleanCouponCode,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        currency: coupon.currency,
        description: `${cleanCouponCode} - ${coupon.percent_off ? `${coupon.percent_off}% Desconto` : `R$ ${((coupon.amount_off || 0) / 100).toFixed(2)} Desconto`}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (error: any) {
      logStep("Stripe error", { error: error.message });
      return new Response(JSON.stringify({
        valid: false,
        error: "Cupom inválido ou expirado"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error: any) {
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