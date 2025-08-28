import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    const envVars = {
      STRIPE_SECRET_KEY: {
        exists: !!stripeKey,
        length: stripeKey ? stripeKey.length : 0,
        firstChars: stripeKey ? stripeKey.substring(0, 10) + "..." : "not set"
      },
      SUPABASE_URL: {
        exists: !!supabaseUrl,
        value: supabaseUrl || "not set"
      },
      SUPABASE_ANON_KEY: {
        exists: !!supabaseAnonKey,
        length: supabaseAnonKey ? supabaseAnonKey.length : 0,
        firstChars: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : "not set"
      }
    };

    return new Response(JSON.stringify({
      success: true,
      environmentVariables: envVars,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});