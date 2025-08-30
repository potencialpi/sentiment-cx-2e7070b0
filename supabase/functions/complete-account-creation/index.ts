import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-ACCOUNT-CREATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Use service role key for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId } = await req.json();
    logStep("Session ID received", { sessionId });

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Retrieve checkout session data
    const { data: checkoutData, error: checkoutError } = await supabaseService
      .from('checkout_sessions')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .eq('status', 'pending')
      .single();

    if (checkoutError || !checkoutData) {
      logStep("Checkout session not found", { checkoutError });
      throw new Error("Checkout session not found or already processed");
    }

    logStep("Checkout session found", { 
      email: checkoutData.email, 
      phoneNumber: checkoutData.phone_number,
      planId: checkoutData.plan_id,
      billingType: checkoutData.billing_type 
    });

    // Verify payment with Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      logStep("Payment not confirmed", { 
        paymentStatus: session.payment_status, 
        status: session.status 
      });
      throw new Error("Payment not confirmed");
    }

    logStep("Payment confirmed by Stripe");

    // Create the user account
    const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
      email: checkoutData.email,
      password: checkoutData.password_hash, // This is actually the plain password, we'll hash it properly
      email_confirm: true, // Auto-confirm email since payment is verified
      user_metadata: {
        company_name: checkoutData.company_name,
        plan_id: checkoutData.plan_id,
        billing_type: checkoutData.billing_type
      }
    });

    if (authError) {
      logStep("Error creating user", authError);
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    const userId = authData.user.id;
    logStep("User created successfully", { userId });

    // Create profile record
    const { error: profileError } = await supabaseService
      .from('profiles')
      .insert({
        user_id: userId,
        email: checkoutData.email,
        plan_name: checkoutData.plan_id,
        billing_type: checkoutData.billing_type,
        status: 'active'
      });

    if (profileError) {
      logStep("Error creating profile", profileError);
      // Don't fail the whole process for profile creation error
    }

    // Create company record
    const { error: companyError } = await supabaseService
      .from('companies')
      .insert({
        user_id: userId,
        company_name: checkoutData.company_name,
        plan_name: checkoutData.plan_id
      });

    if (companyError) {
      logStep("Error creating company", companyError);
      // Don't fail the whole process for company creation error
    }

    // Mark checkout session as completed
    const { error: updateError } = await supabaseService
      .from('checkout_sessions')
      .update({ status: 'completed' })
      .eq('stripe_session_id', sessionId);

    if (updateError) {
      logStep("Error updating checkout session status", updateError);
      // Don't fail the whole process for this error
    }

    logStep("Account creation completed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      userId,
      planId: checkoutData.plan_id,
      email: checkoutData.email 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in complete-account-creation", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});