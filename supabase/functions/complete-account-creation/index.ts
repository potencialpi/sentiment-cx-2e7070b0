import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.12.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Utility function for retry logic with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`[RETRY-SUCCESS] ${operationName} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        console.error(`[RETRY-FAILED] ${operationName} failed after ${maxRetries} attempts:`, lastError.message);
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.warn(`[RETRY-ATTEMPT] ${operationName} failed on attempt ${attempt}/${maxRetries}, retrying in ${Math.round(delay)}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

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
    logStep("Querying checkout session", { sessionId });
    const { data: checkoutData, error: checkoutError } = await supabaseService
      .from('checkout_sessions')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .eq('status', 'pending')
      .single();

    if (checkoutError || !checkoutData) {
      logStep("Checkout session not found", { 
        checkoutError: checkoutError?.message || checkoutError,
        errorCode: checkoutError?.code,
        sessionId 
      });
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
    logStep("Verifying payment with Stripe", { sessionId });
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
      logStep("Stripe session retrieved", { 
        paymentStatus: session.payment_status, 
        status: session.status,
        customerId: session.customer,
        amount: session.amount_total 
      });
    } catch (stripeError) {
      logStep("Error retrieving Stripe session", { 
        error: stripeError.message,
        sessionId 
      });
      throw new Error(`Failed to retrieve Stripe session: ${stripeError.message}`);
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      logStep("Payment not confirmed", { 
        paymentStatus: session.payment_status, 
        status: session.status,
        sessionId 
      });
      throw new Error("Payment not confirmed");
    }

    logStep("Payment confirmed by Stripe", { 
      paymentStatus: session.payment_status,
      amount: session.amount_total 
    });

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
    
    // Check if user already exists before attempting to create with retry logic
    logStep("Checking if user already exists", { email: checkoutData.email });
    const { data: existingUsers, error: listError } = await retryWithBackoff(
      () => supabaseService.auth.admin.listUsers(),
      3,
      1000,
      `listUsers for ${checkoutData.email}`
    );
    
    if (listError) {
      logStep("Error checking existing users", { error: listError.message });
      throw new Error(`Failed to check existing users: ${listError.message}`);
    }
    
    const existingUser = existingUsers.users.find(user => user.email === checkoutData.email);
    
    let authData;
    let userId;
    
    if (existingUser) {
      logStep("User already exists, using existing user", { 
        userId: existingUser.id, 
        email: existingUser.email 
      });
      
      // User already exists, use the existing user
      authData = { user: existingUser };
      userId = existingUser.id;
      
      // Update user metadata with new plan information with retry logic
      const { error: updateError } = await retryWithBackoff(
        () => supabaseService.auth.admin.updateUserById(
          userId,
          {
            user_metadata: {
              ...existingUser.user_metadata,
              company_name: checkoutData.company_name,
              plan_id: checkoutData.plan_id,
              billing_type: checkoutData.billing_type,
              phone_number: checkoutData.phone_number,
              original_password_hash: checkoutData.password_hash
            }
          }
        ),
        3,
        1500,
        `updateUserById for ${userId}`
      );
      
      if (updateError) {
        logStep("Error updating existing user metadata", { error: updateError.message });
        // Don't fail the process for metadata update error
      } else {
        logStep("Updated existing user metadata successfully");
      }
    } else {
      // Generate a temporary password for Supabase Auth since we have the hash stored
      // We'll use the first 12 characters of the hash as a temporary password
      const tempPassword = checkoutData.password_hash.substring(0, 12) + 'Temp!';
      
      logStep("Creating new user with temporary password", { 
        email: checkoutData.email,
        tempPasswordLength: tempPassword.length 
      });

      const { data: newAuthData, error: authError } = await retryWithBackoff(
        () => supabaseService.auth.admin.createUser({
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
        }),
        3,
        1500,
        `createUser for ${checkoutData.email}`
      );
      
      if (authError) {
        logStep("Error creating user", { 
          error: authError.message, 
          code: authError.status,
          details: authError 
        });
        throw new Error(`Failed to create user: ${authError.message}`);
      }
      
      authData = newAuthData;
       userId = newAuthData?.user?.id;
     }

    if (!userId) {
      logStep("User processing failed - no user ID available");
      throw new Error("User processing failed - no user ID available");
    }
    logStep("User created successfully", { userId, email: authData.user.email });

    // Create profile record with retry logic
    logStep("Creating profile record", { userId });
    const { error: profileError } = await retryWithBackoff(
      () => supabaseService
        .from('profiles')
        .upsert({
          user_id: userId,
          email: checkoutData.email,
          plan_name: checkoutData.plan_id,
          billing_type: checkoutData.billing_type,
          status: 'active'
        }, {
          onConflict: 'user_id'
        }),
      3,
      1500,
      `createProfile for userId ${userId}`
    );

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

    // Create company record with retry logic
    logStep("Creating company record", { userId, companyName: checkoutData.company_name });
    const { error: companyError } = await retryWithBackoff(
      () => supabaseService
        .from('companies')
        .upsert({
          user_id: userId,
          company_name: checkoutData.company_name,
          plan_name: checkoutData.plan_id
        }, {
          onConflict: 'user_id'
        }),
      3,
      1500,
      `createCompany for userId ${userId}`
    );

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

    // Mark checkout session as completed with retry logic
    logStep("Updating checkout session status to completed", { sessionId });
    const { error: updateError } = await retryWithBackoff(
      () => supabaseService
        .from('checkout_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('stripe_session_id', sessionId),
      3,
      1500,
      `updateCheckoutSession for sessionId ${sessionId}`
    );

    if (updateError) {
      logStep("Error updating checkout session status", { 
        error: updateError.message,
        code: updateError.code,
        sessionId 
      });
      // Don't fail the whole process for this error
    } else {
      logStep("Checkout session marked as completed successfully");
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
    const errorDetails = {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestBody: requestBody || {},
      sessionId: requestBody?.sessionId || 'unknown'
    };
    
    logStep("CRITICAL ERROR in complete-account-creation", errorDetails);
    
    // Log additional context for debugging
    console.error('[COMPLETE-ACCOUNT-CREATION] Full error context:', {
      error: error,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      ...errorDetails
    });
    
    // Return 200 status with success: false to avoid FunctionsHttpError
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      timestamp: errorDetails.timestamp
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Changed from 500 to 200 to avoid non-2xx error
    });
  }
});