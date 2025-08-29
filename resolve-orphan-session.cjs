const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Create Supabase clients - use service client for all operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

const orphanEmail = 'jeffersonferreira1971@gmail.com';

async function resolveOrphanSession() {
  console.log('🔍 Resolving orphan session for:', orphanEmail);
  
  try {
    // 1. Get the orphan checkout session details
    console.log('\n📋 Step 1: Getting checkout session details...');
    const { data: checkoutSession, error: sessionError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('email', orphanEmail)
      .eq('status', 'completed')
      .single();
    
    if (sessionError) {
      console.error('❌ Error getting checkout session:', sessionError);
      return;
    }
    
    if (!checkoutSession) {
      console.log('❌ No completed checkout session found for', orphanEmail);
      return;
    }
    
    console.log('✅ Found checkout session:', {
      id: checkoutSession.id,
      stripe_session_id: checkoutSession.stripe_session_id,
      plan_id: checkoutSession.plan_id,
      billing_type: checkoutSession.billing_type,
      amount: checkoutSession.amount,
      created_at: checkoutSession.created_at
    });
    
    // 2. Check if user exists in Supabase Auth
    console.log('\n👤 Step 2: Checking if user exists in Supabase Auth...');
    const { data: users, error: listError } = await supabaseService.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    const existingUser = users.users.find(user => user.email === orphanEmail);
    
    if (existingUser) {
      console.log('✅ User already exists in Auth:', {
        id: existingUser.id,
        email: existingUser.email,
        created_at: existingUser.created_at
      });
      
      // Check if user has profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', existingUser.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ Error checking profile:', profileError);
        return;
      }
      
      if (!profile) {
        console.log('⚠️ User exists but no profile found. Creating profile...');
        
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: existingUser.id,
            email: orphanEmail,
            plan_type: checkoutSession.plan_id,
            billing_type: checkoutSession.billing_type,
            subscription_status: 'inactive'
          });
          
        if (createProfileError) {
          console.error('❌ Error creating profile:', createProfileError);
        } else {
          console.log('✅ Profile created successfully');
        }
      } else {
        console.log('✅ User profile exists:', {
          id: profile.id,
          email: profile.email,
          company_name: profile.company_name,
          plan_type: profile.plan_type,
          subscription_status: profile.subscription_status
        });
      }
    } else {
      console.log('⚠️ User does not exist in Auth. Creating user...');
      
      // Create user with temporary password
      const tempPassword = 'TempPass123!';
      const { data: newUser, error: createError } = await supabaseService.auth.admin.createUser({
        email: orphanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          company_name: checkoutSession.company_name,
          plan_type: checkoutSession.plan_id,
          billing_type: checkoutSession.billing_type,
          created_from_orphan_session: true,
          original_checkout_session: checkoutSession.stripe_session_id
        }
      });
      
      if (createError) {
        console.error('❌ Error creating user:', createError);
        return;
      }
      
      console.log('✅ User created successfully:', {
        id: newUser.user.id,
        email: newUser.user.email
      });
      
      // Create profile for the new user
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          email: orphanEmail,
          plan_type: checkoutSession.plan_id,
          billing_type: checkoutSession.billing_type,
          subscription_status: 'active'
        });
        
      if (createProfileError) {
        console.error('❌ Error creating profile:', createProfileError);
      } else {
        console.log('✅ Profile created successfully');
      }
      
      console.log('\n🔑 IMPORTANT: User created with temporary password:', tempPassword);
      console.log('📧 User should be notified to reset their password.');
    }
    
    console.log('\n✅ Orphan session resolution completed successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the resolution
resolveOrphanSession().then(() => {
  console.log('\n🏁 Script completed.');
}).catch(error => {
  console.error('💥 Script failed:', error);
});