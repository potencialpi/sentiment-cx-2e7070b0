import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleAuth() {
  console.log('🧪 Testando Auth básico sem metadados...');
  
  const testEmail = `test-simple-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  
  const report = {
    timestamp: new Date().toISOString(),
    test_email: testEmail,
    tests: [],
    success: false,
    errors: []
  };
  
  try {
    // Teste 1: Signup básico sem metadados
    console.log('📝 Teste 1: Signup básico sem metadados...');
    const { data: authData1, error: authError1 } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (authError1) {
      report.tests.push({
        test: 'basic_signup',
        success: false,
        error: authError1.message
      });
      report.errors.push(`Basic signup failed: ${authError1.message}`);
      console.log(`❌ Signup básico falhou: ${authError1.message}`);
    } else {
      report.tests.push({
        test: 'basic_signup',
        success: true,
        user_id: authData1.user?.id
      });
      console.log(`✅ Signup básico bem-sucedido: ${authData1.user?.id}`);
    }
    
    // Teste 2: Verificar se conseguimos fazer login
    if (authData1.user) {
      console.log('📝 Teste 2: Tentando fazer login...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (loginError) {
        report.tests.push({
          test: 'login_test',
          success: false,
          error: loginError.message
        });
        console.log(`❌ Login falhou: ${loginError.message}`);
      } else {
        report.tests.push({
          test: 'login_test',
          success: true,
          user_id: loginData.user?.id
        });
        console.log(`✅ Login bem-sucedido: ${loginData.user?.id}`);
      }
    }
    
    // Teste 3: Tentar criar registros nas tabelas manualmente
    if (authData1.user) {
      console.log('📝 Teste 3: Criando registros nas tabelas...');
      const userId = authData1.user.id;
      
      // Tentar criar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          plan_name: 'start-quantico',
          status: 'active'
        });
      
      if (profileError) {
        report.tests.push({
          test: 'create_profile',
          success: false,
          error: profileError.message
        });
        console.log(`❌ Erro ao criar profile: ${profileError.message}`);
      } else {
        report.tests.push({
          test: 'create_profile',
          success: true
        });
        console.log('✅ Profile criado com sucesso');
      }
      
      // Tentar criar company
      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          user_id: userId,
          company_name: 'Empresa Teste',
          plan_name: 'start-quantico'
        });
      
      if (companyError) {
        report.tests.push({
          test: 'create_company',
          success: false,
          error: companyError.message
        });
        console.log(`❌ Erro ao criar company: ${companyError.message}`);
      } else {
        report.tests.push({
          test: 'create_company',
          success: true
        });
        console.log('✅ Company criado com sucesso');
      }
    }
    
    // Determinar sucesso geral
    const basicSignupSuccess = report.tests.find(t => t.test === 'basic_signup')?.success;
    report.success = basicSignupSuccess || false;
    
    if (report.success) {
      console.log('🎉 Teste de Auth básico bem-sucedido!');
    } else {
      console.log('❌ Teste de Auth básico falhou');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    report.errors.push(`General error: ${error.message}`);
  }
  
  // Salvar relatório
  const reportPath = './RELATORIO_TESTE_SIMPLES.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Relatório salvo em: ${reportPath}`);
  
  return report;
}

// Executar teste
testSimpleAuth()
  .then(() => {
    console.log('✅ Teste concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  });