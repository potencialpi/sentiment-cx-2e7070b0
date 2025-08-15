import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testManualSignup() {
  console.log('🧪 Testando criação manual de usuário...');
  
  const testEmail = `test-manual-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  const testCompanyName = 'Empresa Teste Manual';
  const testPlan = 'start-quantico';
  
  const report = {
    timestamp: new Date().toISOString(),
    test_email: testEmail,
    steps: [],
    success: false,
    errors: []
  };
  
  try {
    // Passo 1: Criar usuário no Auth
    console.log('📝 Passo 1: Criando usuário no Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          company_name: testCompanyName,
          plan_id: testPlan,
          billing_type: 'monthly'
        }
      }
    });
    
    if (authError) {
      report.steps.push({
        step: 'auth_signup',
        success: false,
        error: authError.message
      });
      report.errors.push(`Auth signup failed: ${authError.message}`);
      throw authError;
    }
    
    if (!authData.user) {
      const error = 'Usuário não foi criado no Auth';
      report.steps.push({
        step: 'auth_signup',
        success: false,
        error: error
      });
      report.errors.push(error);
      throw new Error(error);
    }
    
    report.steps.push({
      step: 'auth_signup',
      success: true,
      user_id: authData.user.id
    });
    
    const userId = authData.user.id;
    console.log(`✅ Usuário criado no Auth: ${userId}`);
    
    // Passo 2: Criar profile manualmente
    console.log('📝 Passo 2: Criando profile manualmente...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        plan_name: testPlan,
        status: 'active'
      });
    
    if (profileError) {
      report.steps.push({
        step: 'create_profile',
        success: false,
        error: profileError.message
      });
      report.errors.push(`Profile creation failed: ${profileError.message}`);
      console.log(`❌ Erro ao criar profile: ${profileError.message}`);
    } else {
      report.steps.push({
        step: 'create_profile',
        success: true
      });
      console.log('✅ Profile criado com sucesso');
    }
    
    // Passo 3: Criar company manualmente
    console.log('📝 Passo 3: Criando company manualmente...');
    const { error: companyError } = await supabase
      .from('companies')
      .insert({
        user_id: userId,
        company_name: testCompanyName,
        plan_name: testPlan
      });
    
    if (companyError) {
      report.steps.push({
        step: 'create_company',
        success: false,
        error: companyError.message
      });
      report.errors.push(`Company creation failed: ${companyError.message}`);
      console.log(`❌ Erro ao criar company: ${companyError.message}`);
    } else {
      report.steps.push({
        step: 'create_company',
        success: true
      });
      console.log('✅ Company criado com sucesso');
    }
    
    // Passo 4: Verificar se os registros foram criados
    console.log('📝 Passo 4: Verificando registros criados...');
    
    // Verificar profile
    const { data: profileData, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (profileCheckError) {
      report.steps.push({
        step: 'verify_profile',
        success: false,
        error: profileCheckError.message
      });
      console.log(`❌ Erro ao verificar profile: ${profileCheckError.message}`);
    } else {
      report.steps.push({
        step: 'verify_profile',
        success: true,
        data: profileData
      });
      console.log('✅ Profile verificado:', profileData);
    }
    
    // Verificar company
    const { data: companyData, error: companyCheckError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (companyCheckError) {
      report.steps.push({
        step: 'verify_company',
        success: false,
        error: companyCheckError.message
      });
      console.log(`❌ Erro ao verificar company: ${companyCheckError.message}`);
    } else {
      report.steps.push({
        step: 'verify_company',
        success: true,
        data: companyData
      });
      console.log('✅ Company verificado:', companyData);
    }
    
    // Determinar sucesso geral
    const authSuccess = report.steps.find(s => s.step === 'auth_signup')?.success;
    const profileSuccess = report.steps.find(s => s.step === 'create_profile')?.success;
    const companySuccess = report.steps.find(s => s.step === 'create_company')?.success;
    
    report.success = authSuccess && (profileSuccess || companySuccess);
    
    if (report.success) {
      console.log('🎉 Teste de criação manual bem-sucedido!');
    } else {
      console.log('❌ Teste de criação manual falhou');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    report.errors.push(`General error: ${error.message}`);
  }
  
  // Salvar relatório
  const reportPath = './RELATORIO_TESTE_MANUAL.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Relatório salvo em: ${reportPath}`);
  
  return report;
}

// Executar teste
testManualSignup()
  .then(() => {
    console.log('✅ Teste concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  });