import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.12.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({
        valid: false,
        error: "Configuração do servidor incorreta"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const { couponCode } = await req.json();
    
    if (!couponCode?.trim()) {
      return new Response(JSON.stringify({
        valid: false,
        error: "Código do cupom é obrigatório"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const cleanCode = couponCode.trim().replace(/\s+/g, '');
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    try {
      // Try to retrieve coupon directly
      const coupon = await stripe.coupons.retrieve(cleanCode);
      
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

    } catch (stripeError) {
      return new Response(JSON.stringify({
        valid: false,
        error: "Cupom não encontrado"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      valid: false,
      error: "Erro interno do servidor"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});