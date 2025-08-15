// Script de teste para verificar problemas de Auth do Supabase
import { createClient } from '@supabase/supabase-js';

// Credenciais do projeto
const SUPABASE_URL = 'https://mjuxvppexydaeuoernxa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

async function testSupabaseConnection() {
  console.log('🔍 TESTE 1: Conectividade básica do Supabase');
  console.log('=' .repeat(50));
  
  try {
    // Cliente com anon key
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Teste básico de conectividade
    const { data, error } = await supabaseAnon.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erro na conectividade básica:', error.message);
      console.log('   Código:', error.code);
      console.log('   Detalhes:', error.details);
    } else {
      console.log('✅ Conectividade básica OK');
    }
  } catch (err) {
    console.log('❌ Erro de conexão:', err.message);
  }
}

async function testAuthBasic() {
  console.log('\n🔍 TESTE 2: Auth básico com service_role_key');
  console.log('=' .repeat(50));
  
  try {
    // Cliente com service role key
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Teste de acesso administrativo
    const { data, error } = await supabaseService.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Erro no Auth básico:', error.message);
      console.log('   Código:', error.code);
      console.log('   Status:', error.status);
    } else {
      console.log('✅ Auth básico OK - Usuários encontrados:', data.users.length);
    }
  } catch (err) {
    console.log('❌ Erro no Auth:', err.message);
  }
}

async function testSignUpSimple() {
  console.log('\n🔍 TESTE 3: SignUp simples (sem metadados)');
  console.log('=' .repeat(50));
  
  try {
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const testEmail = `teste-${Date.now()}@exemplo.com`;
    const testPassword = 'TesteSeguro123!';
    
    console.log('📧 Testando com:', testEmail);
    
    const { data, error } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.log('❌ Erro no SignUp simples:', error.message);
      console.log('   Código:', error.code);
      console.log('   Status:', error.status);
    } else {
      console.log('✅ SignUp simples OK');
      console.log('   User ID:', data.user?.id);
      console.log('   Email confirmado:', data.user?.email_confirmed_at ? 'Sim' : 'Não');
    }
  } catch (err) {
    console.log('❌ Erro no SignUp:', err.message);
  }
}

async function testSignUpWithMetadata() {
  console.log('\n🔍 TESTE 4: SignUp com metadados');
  console.log('=' .repeat(50));
  
  try {
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const testEmail = `teste-meta-${Date.now()}@exemplo.com`;
    const testPassword = 'TesteSeguro123!';
    
    console.log('📧 Testando com:', testEmail);
    
    const { data, error } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          company_name: 'Empresa Teste',
          plan_id: 'start-quantico',
          billing_type: 'monthly'
        }
      }
    });
    
    if (error) {
      console.log('❌ Erro no SignUp com metadados:', error.message);
      console.log('   Código:', error.code);
      console.log('   Status:', error.status);
    } else {
      console.log('✅ SignUp com metadados OK');
      console.log('   User ID:', data.user?.id);
      console.log('   Metadados:', data.user?.user_metadata);
    }
  } catch (err) {
    console.log('❌ Erro no SignUp:', err.message);
  }
}

async function runAllTests() {
  console.log('🚀 INICIANDO TESTES DE DIAGNÓSTICO DO SUPABASE AUTH');
  console.log('=' .repeat(60));
  
  await testSupabaseConnection();
  await testAuthBasic();
  await testSignUpSimple();
  await testSignUpWithMetadata();
  
  console.log('\n✅ TESTES CONCLUÍDOS');
  console.log('=' .repeat(60));
}

// Executar testes
runAllTests().catch(console.error);