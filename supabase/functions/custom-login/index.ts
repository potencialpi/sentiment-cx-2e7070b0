import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOM-LOGIN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { email, password } = await req.json();
    
    if (!email || !password) {
      logStep("Validation failed: Missing email or password");
      return new Response(
        JSON.stringify({ success: false, error: "Email and password are required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Login attempt", { email, passwordLength: password.length });

    // Hash the provided password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    logStep("Password hashed for comparison", { hashedLength: hashedPassword.length });

    // Check if user exists in checkout_sessions with matching email and password hash
    const { data: checkoutData, error: checkoutError } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("email", email)
      .eq("password_hash", hashedPassword)
      .single();

    if (checkoutError || !checkoutData) {
      logStep("Authentication failed", { error: checkoutError?.message });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email or password" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Password hash verified successfully");

    // Get the user from Supabase Auth using email
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      logStep("Error fetching users", { error: getUserError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Authentication error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = users.find(u => u.email === email);
    
    if (!user) {
      logStep("User not found in auth system", { email });
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("User found in auth system", { userId: user.id });

    // Generate a session token for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:8080'}/dashboard`
      }
    });

    if (sessionError || !sessionData) {
      logStep("Error generating session", { error: sessionError?.message });
      return new Response(
        JSON.stringify({ success: false, error: "Session generation failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Session generated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        },
        session_url: sessionData.properties?.action_link
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Function error", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});