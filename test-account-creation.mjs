import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testTriggerFunctions() {
  console.log('🔍 Testando funções de trigger...');
  
  try {
    // Testar se as funções existem
    const { data: functions, error: funcError } = await supabaseAdmin
      .from('information_schema.routines')
      .select('routine_name')
      .in('routine_name', ['handle_new_user_profile', 'handle_new_user_company']);
    
    if (funcError) {
      console.log('❌ Erro ao verificar funções:', funcError.message);
      return false;
    }
    
    console.log('📋 Funções encontradas:', functions?.map(f => f.routine_name) || []);
    
    // Testar se os triggers existem
    const { data: triggers, error: trigError } = await supabaseAdmin
      .from('information_schema.triggers')
      .select('trigger_name')
      .in('trigger_name', ['on_auth_user_created_profile', 'on_auth_user_created_company']);
    
    if (trigError) {
      console.log('❌ Erro ao verificar triggers:', trigError.message);
      return false;
    }
    
    console.log('🔗 Triggers encontrados:', triggers?.map(t => t.trigger_name) || []);
    
    return true;
  } catch (error) {
    console.log('❌ Erro no teste de triggers:', error.message);
    return false;
  }
}

async function testBasicAuth() {
  console.log('🧪 Testando Auth básico (sem triggers)...');
  
  try {
    // Usar service role para bypassar triggers temporariamente
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true
    });
    
    if (error) {
      console.log('❌ Erro no Auth básico:', error.message, '| Código:', error.code);
      return false;
    }
    
    console.log('✅ Auth básico funcionando - User ID:', data.user?.id);
    
    // Limpar o usuário criado
    if (data.user?.id) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.log('🧹 Usuário de teste removido');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erro no teste de Auth:', error.message);
    return false;
  }
}

async function testSignUpWithTriggers() {
  console.log('🧪 Testando SignUp com triggers...');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: `test-triggers-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      options: {
        data: {
          company_name: 'Test Company',
          plan_id: 'start-quantico',
          billing_type: 'monthly'
        }
      }
    });
    
    if (error) {
      console.log('❌ Erro no SignUp com triggers:', error.message, '| Código:', error.code);
      return false;
    }
    
    console.log('✅ SignUp com triggers funcionando - User ID:', data.user?.id);
    return true;
  } catch (error) {
    console.log('❌ Erro no teste de SignUp:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Diagnóstico avançado do erro de criação de conta\n');
  
  const triggerTest = await testTriggerFunctions();
  console.log('');
  
  const authTest = await testBasicAuth();
  console.log('');
  
  const signUpTest = await testSignUpWithTriggers();
  console.log('');
  
  console.log('📋 RESUMO FINAL:');
  console.log('Funções/Triggers:', triggerTest ? '✅' : '❌');
  console.log('Auth básico:', authTest ? '✅' : '❌');
  console.log('SignUp com triggers:', signUpTest ? '✅' : '❌');
  
  if (authTest && !signUpTest) {
    console.log('\n🔍 DIAGNÓSTICO: O problema está nos triggers, não no Auth básico.');
  } else if (!authTest) {
    console.log('\n🔍 DIAGNÓSTICO: O problema está na configuração básica do Supabase Auth.');
  }
}

main().catch(console.error);