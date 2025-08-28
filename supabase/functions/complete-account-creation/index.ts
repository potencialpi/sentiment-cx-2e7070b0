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

    const requestBody = await req.json();
    const { sessionId } = requestBody;
    logStep("Request received", { sessionId, bodyKeys: Object.keys(requestBody) });

    if (!sessionId) {
      logStep("Validation failed: Session ID missing");
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
      billingType: checkoutData.billing_type,
      companyName: checkoutData.company_name,
      hasPasswordHash: !!checkoutData.password_hash,
      passwordHashLength: checkoutData.password_hash ? checkoutData.password_hash.length : 0,
      allFields: Object.keys(checkoutData)
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
    logStep("Creating user account", { email: checkoutData.email });
    
    // Validate required fields
    if (!checkoutData.password_hash) {
      logStep("Validation failed: Password hash missing from checkout data", {
        availableFields: Object.keys(checkoutData),
        passwordHashField: checkoutData.password_hash ? 'password_hash found' : 'no password_hash field'
      });
      throw new Error("Password hash is required for account creation");
    }
    
    if (!checkoutData.email) {
      logStep("Validation failed: Email missing");
      throw new Error("Email is required for account creation");
    }
    
    if (!checkoutData.company_name) {
      logStep("Validation failed: Company name missing");
      throw new Error("Company name is required for account creation");
    }
    
    // Generate a temporary password for Supabase Auth since we have the hash stored
    // We'll use the first 12 characters of the hash as a temporary password
    const tempPassword = checkoutData.password_hash.substring(0, 12) + 'Temp!';
    
    logStep("Creating user with temporary password", { 
      email: checkoutData.email,
      tempPasswordLength: tempPassword.length 
    });

    const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
      email: checkoutData.email,
      password: tempPassword, // Use temporary password for Supabase Auth
      email_confirm: true, // Auto-confirm email since payment is verified
      user_metadata: {
        company_name: checkoutData.company_name,
        plan_id: checkoutData.plan_id,
        billing_type: checkoutData.billing_type,
        phone_number: checkoutData.phone_number,
        original_password_hash: checkoutData.password_hash // Store original hash in metadata
      }
    });

    if (authError) {
      logStep("Error creating user", { 
        error: authError.message, 
        code: authError.status,
        details: authError 
      });
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    if (!authData?.user?.id) {
      logStep("User creation failed - no user data returned");
      throw new Error("User creation failed - no user data returned");
    }

    const userId = authData.user.id;
    logStep("User created successfully", { userId, email: authData.user.email });

    // Create profile record
    logStep("Creating profile record", { userId });
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
      logStep("Error creating profile", { 
        error: profileError.message, 
        code: profileError.code,
        details: profileError 
      });
      // Don't fail the whole process for profile creation error
    } else {
      logStep("Profile created successfully");
    }

    // Create company record
    logStep("Creating company record", { userId, companyName: checkoutData.company_name });
    const { error: companyError } = await supabaseService
      .from('companies')
      .insert({
        user_id: userId,
        company_name: checkoutData.company_name,
        plan_name: checkoutData.plan_id
      });

    if (companyError) {
      logStep("Error creating company", { 
        error: companyError.message, 
        code: companyError.code,
        details: companyError 
      });
      // Don't fail the whole process for company creation error
    } else {
      logStep("Company created successfully");
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
    logStep("ERROR in complete-account-creation", { 
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return 200 status with success: false to avoid FunctionsHttpError
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Changed from 500 to 200 to avoid non-2xx error
    });
  }
});