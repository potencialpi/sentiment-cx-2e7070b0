import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSimpleSignUp() {
  console.log('🧪 TESTE: SignUp Simples sem Metadados');
  console.log('=' .repeat(50));
  
  // Gerar email único para teste
  const timestamp = Date.now();
  const testEmail = `test-simple-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`📧 Email de teste: ${testEmail}`);
  console.log(`🔐 Password: ${testPassword}`);
  console.log('');
  
  try {
    console.log('⏳ Tentando SignUp simples...');
    
    // Teste 1: SignUp básico sem metadados
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.log('❌ ERRO no SignUp simples:');
      console.log('   Mensagem:', error.message);
      console.log('   Código:', error.status || 'N/A');
      console.log('   Tipo:', error.name || 'N/A');
      console.log('   Detalhes completos:', JSON.stringify(error, null, 2));
      return false;
    }
    
    console.log('✅ SignUp simples SUCESSO!');
    console.log('   User ID:', data.user?.id || 'N/A');
    console.log('   Email:', data.user?.email || 'N/A');
    console.log('   Email confirmado:', data.user?.email_confirmed_at ? 'Sim' : 'Não');
    console.log('   Session:', data.session ? 'Criada' : 'Não criada');
    
    return true;
    
  } catch (err) {
    console.log('💥 EXCEÇÃO durante SignUp simples:');
    console.log('   Erro:', err.message);
    console.log('   Stack:', err.stack);
    return false;
  }
}

async function testWithEmailConfirmationDisabled() {
  console.log('\n🧪 TESTE: SignUp com confirmação de email desabilitada');
  console.log('=' .repeat(50));
  
  // Gerar email único para teste
  const timestamp = Date.now();
  const testEmail = `test-no-confirm-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`📧 Email de teste: ${testEmail}`);
  console.log(`🔐 Password: ${testPassword}`);
  console.log('');
  
  try {
    console.log('⏳ Tentando SignUp com confirmação desabilitada...');
    
    // Teste 2: SignUp com opção de não confirmar email
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: undefined,
        data: {}
      }
    });
    
    if (error) {
      console.log('❌ ERRO no SignUp sem confirmação:');
      console.log('   Mensagem:', error.message);
      console.log('   Código:', error.status || 'N/A');
      console.log('   Tipo:', error.name || 'N/A');
      console.log('   Detalhes completos:', JSON.stringify(error, null, 2));
      return false;
    }
    
    console.log('✅ SignUp sem confirmação SUCESSO!');
    console.log('   User ID:', data.user?.id || 'N/A');
    console.log('   Email:', data.user?.email || 'N/A');
    console.log('   Email confirmado:', data.user?.email_confirmed_at ? 'Sim' : 'Não');
    console.log('   Session:', data.session ? 'Criada' : 'Não criada');
    
    return true;
    
  } catch (err) {
    console.log('💥 EXCEÇÃO durante SignUp sem confirmação:');
    console.log('   Erro:', err.message);
    console.log('   Stack:', err.stack);
    return false;
  }
}

async function main() {
  console.log('🚀 INICIANDO TESTES DE SIGNUP SIMPLES');
  console.log('Data/Hora:', new Date().toLocaleString());
  console.log('\n');
  
  // Teste 1: SignUp básico
  const test1Success = await testSimpleSignUp();
  
  // Teste 2: SignUp sem confirmação
  const test2Success = await testWithEmailConfirmationDisabled();
  
  // Resumo dos resultados
  console.log('\n📊 RESUMO DOS TESTES:');
  console.log('=' .repeat(50));
  console.log(`SignUp Simples: ${test1Success ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`SignUp Sem Confirmação: ${test2Success ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  if (!test1Success && !test2Success) {
    console.log('\n🔍 DIAGNÓSTICO:');
    console.log('Ambos os testes falharam, indicando que o problema está na');
    console.log('configuração básica do Supabase Auth, não nos triggers ou metadados.');
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('1. Verificar painel do Supabase se Auth está habilitado');
    console.log('2. Verificar se há limites de usuários atingidos');
    console.log('3. Verificar logs do Supabase Dashboard');
    console.log('4. Considerar recriar o projeto Supabase');
  } else if (test1Success || test2Success) {
    console.log('\n✅ SUCESSO PARCIAL OU TOTAL!');
    console.log('O problema pode estar relacionado a configurações específicas');
    console.log('ou metadados, não na funcionalidade básica do Auth.');
  }
  
  console.log('\n🏁 Testes concluídos.');
}

// Executar os testes
main().catch(console.error);