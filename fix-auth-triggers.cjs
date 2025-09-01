require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAuthTriggers() {
  console.log('🔧 Corrigindo triggers de autenticação...');
  
  try {
    // 1. Criar função handle_new_user_profile
    console.log('📝 Criando função handle_new_user_profile...');
    const profileFunction = `
      CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        INSERT INTO public.profiles (
          user_id,
          email,
          plan_name,
          subscription_status,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          NEW.email,
          'start-quantico',
          'active',
          NOW(),
          NOW()
        );
        RETURN NEW;
      EXCEPTION
        WHEN others THEN
          RAISE LOG 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
          RETURN NEW;
      END;
      $$;
    `;
    
    const { error: funcError } = await supabase.rpc('exec', { sql: profileFunction });
    if (funcError) {
      console.log('❌ Erro ao criar função:', funcError);
    } else {
      console.log('✅ Função handle_new_user_profile criada');
    }
    
    // 2. Criar função handle_new_user_company
    console.log('📝 Criando função handle_new_user_company...');
    const companyFunction = `
      CREATE OR REPLACE FUNCTION public.handle_new_user_company()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        INSERT INTO public.companies (
          user_id,
          name,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'),
          NOW(),
          NOW()
        );
        RETURN NEW;
      EXCEPTION
        WHEN others THEN
          RAISE LOG 'Erro ao criar empresa para usuário %: %', NEW.id, SQLERRM;
          RETURN NEW;
      END;
      $$;
    `;
    
    const { error: companyFuncError } = await supabase.rpc('exec', { sql: companyFunction });
    if (companyFuncError) {
      console.log('❌ Erro ao criar função company:', companyFuncError);
    } else {
      console.log('✅ Função handle_new_user_company criada');
    }
    
    // 3. Criar triggers
    console.log('📝 Criando triggers...');
    const triggers = `
      DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
      DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;
      
      CREATE TRIGGER on_auth_user_created_profile
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
        
      CREATE TRIGGER on_auth_user_created_company
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company();
    `;
    
    const { error: triggerError } = await supabase.rpc('exec', { sql: triggers });
    if (triggerError) {
      console.log('❌ Erro ao criar triggers:', triggerError);
    } else {
      console.log('✅ Triggers criados com sucesso');
    }
    
    // 4. Testar criação de usuário
    console.log('🧪 Testando criação de usuário...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'SuperSecurePassword2024!@#$'
    });
    
    if (signupError) {
      console.log('❌ Erro no signup:', signupError);
    } else {
      console.log('✅ Usuário criado:', signupData.user?.id);
      
      // Verificar se o perfil foi criado
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', signupData.user?.id)
        .single();
        
      if (profileError) {
        console.log('❌ Perfil não foi criado automaticamente:', profileError);
      } else {
        console.log('✅ Perfil criado automaticamente:', profile);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixAuthTriggers();