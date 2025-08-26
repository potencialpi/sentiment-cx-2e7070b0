const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Contas de teste
const testAccounts = [
  { email: 'teste.basico@example.com', password: 'senha123', plan: 'basico' },
  { email: 'teste.vortex@example.com', password: 'senha123', plan: 'vortex-pro' },
  { email: 'teste.nexus@example.com', password: 'senha123', plan: 'nexus-infinito' }
];

async function checkRLSPolicies() {
  console.log('🔍 Iniciando diagnóstico avançado das políticas RLS...');
  
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // 1. Verificar políticas RLS existentes
    console.log('\n📋 Verificando políticas RLS existentes...');
    const { data: policies, error: policiesError } = await serviceClient
      .from('pg_policies')
      .select('*')
      .in('tablename', ['surveys', 'responses', 'profiles']);
    
    if (policiesError) {
      console.error('❌ Erro ao buscar políticas:', policiesError);
    } else {
      console.log('✅ Políticas encontradas:', policies.length);
      policies.forEach(policy => {
        console.log(`  - ${policy.tablename}.${policy.policyname}: ${policy.cmd} (${policy.roles})`);
      });
    }
    
    // 2. Testar isolamento com queries diretas
    console.log('\n🔒 Testando isolamento de dados...');
    
    for (const account of testAccounts) {
      console.log(`\n👤 Testando conta: ${account.email}`);
      
      const userClient = createClient(supabaseUrl, supabaseAnonKey);
      
      // Login
      const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
        email: account.email,
        password: account.password
      });
      
      if (authError) {
        console.log(`❌ Falha no login: ${authError.message}`);
        continue;
      }
      
      console.log(`✅ Login bem-sucedido. User ID: ${authData.user.id}`);
      
      // Testar SELECT em surveys
      const { data: surveys, error: surveysError } = await userClient
        .from('surveys')
        .select('id, title, user_id')
        .limit(20);
      
      if (surveysError) {
        console.log(`❌ Erro ao buscar surveys: ${surveysError.message}`);
      } else {
        console.log(`📊 Surveys visíveis: ${surveys.length}`);
        
        // Verificar se há surveys de outros usuários
        const ownSurveys = surveys.filter(s => s.user_id === authData.user.id);
        const otherSurveys = surveys.filter(s => s.user_id !== authData.user.id);
        
        console.log(`  - Próprios surveys: ${ownSurveys.length}`);
        console.log(`  - Surveys de outros: ${otherSurveys.length}`);
        
        if (otherSurveys.length > 0) {
          console.log(`⚠️  PROBLEMA DE ISOLAMENTO: Usuário pode ver surveys de outros!`);
          otherSurveys.slice(0, 3).forEach(s => {
            console.log(`    - Survey ID ${s.id} pertence ao usuário ${s.user_id}`);
          });
        }
      }
      
      // Testar INSERT
      const testSurvey = {
        title: `Teste RLS ${Date.now()}`,
        description: 'Survey de teste para diagnóstico RLS',
        user_id: authData.user.id,
        unique_link: `test-${Date.now()}`,
        max_responses: 100,
        status: 'active'
      };
      
      const { data: insertData, error: insertError } = await userClient
        .from('surveys')
        .insert(testSurvey)
        .select();
      
      if (insertError) {
        console.log(`❌ Erro ao inserir survey: ${insertError.message}`);
      } else {
        console.log(`✅ Survey inserido com sucesso: ID ${insertData[0].id}`);
      }
      
      await userClient.auth.signOut();
    }
    
    // 3. Verificar RLS usando service role
    console.log('\n🔧 Verificando dados com service role...');
    
    const { data: allSurveys, error: allSurveysError } = await serviceClient
      .from('surveys')
      .select('id, title, user_id')
      .limit(50);
    
    if (allSurveysError) {
      console.log(`❌ Erro ao buscar todos os surveys: ${allSurveysError.message}`);
    } else {
      console.log(`📊 Total de surveys no banco: ${allSurveys.length}`);
      
      // Agrupar por usuário
      const surveysByUser = {};
      allSurveys.forEach(survey => {
        if (!surveysByUser[survey.user_id]) {
          surveysByUser[survey.user_id] = 0;
        }
        surveysByUser[survey.user_id]++;
      });
      
      console.log('📈 Distribuição de surveys por usuário:');
      Object.entries(surveysByUser).forEach(([userId, count]) => {
        console.log(`  - Usuário ${userId}: ${count} surveys`);
      });
    }
    
    console.log('\n✅ Diagnóstico concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error);
  }
}

// Executar diagnóstico
checkRLSPolicies().catch(console.error);