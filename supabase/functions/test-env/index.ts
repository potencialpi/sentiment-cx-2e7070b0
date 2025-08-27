import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get all environment variables
    const envVars: Record<string, string> = {};
    
    // Check for common Stripe-related environment variables
    const stripeVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY', 
      'STRIPE_API_VERSION',
      'STRIPE_WEBHOOK_SECRET'
    ];
    
    stripeVars.forEach(varName => {
      const value = Deno.env.get(varName);
      if (value) {
        // Mask sensitive keys but show API version
        if (varName === 'STRIPE_API_VERSION') {
          envVars[varName] = value;
        } else {
          envVars[varName] = value.substring(0, 10) + '...';
        }
      } else {
        envVars[varName] = 'NOT_SET';
      }
    });
    
    // Also check for any environment variable containing 'stripe' (case insensitive)
    const allEnvKeys = Object.keys(Deno.env.toObject());
    const stripeRelatedKeys = allEnvKeys.filter(key => 
      key.toLowerCase().includes('stripe')
    );
    
    const stripeRelatedVars: Record<string, string> = {};
    stripeRelatedKeys.forEach(key => {
      const value = Deno.env.get(key);
      if (value) {
        if (key.toLowerCase().includes('version') || key.toLowerCase().includes('api')) {
          stripeRelatedVars[key] = value;
        } else {
          stripeRelatedVars[key] = value.substring(0, 10) + '...';
        }
      }
    });

    const result = {
      message: "Environment variables check",
      stripeVars,
      stripeRelatedVars,
      totalEnvVars: allEnvKeys.length
    };

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});