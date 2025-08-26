const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Contas de teste com senhas mais fortes
const testAccounts = [
  { email: 'teste.isolamento.forte1@example.com', password: 'MinhaSenh@Forte123!', plan: 'basico' },
  { email: 'teste.isolamento.forte2@example.com', password: 'OutraSenh@Forte456!', plan: 'vortex-pro' },
  { email: 'teste.isolamento.forte3@example.com', password: 'TerceiraSenh@Forte789!', plan: 'nexus-infinito' }
];

async function testDataIsolation() {
  console.log('🔍 Testando isolamento de dados com contas novas e senhas fortes...');
  
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const results = {
    timestamp: new Date().toISOString(),
    accounts_tested: [],
    isolation_issues: [],
    summary: {
      total_accounts: testAccounts.length,
      successful_logins: 0,
      isolation_violations: 0,
      rls_working: true
    }
  };
  
  try {
    // 1. Primeiro, vamos verificar quantos surveys existem no total
    console.log('\n📊 Verificando total de surveys no banco...');
    const { data: allSurveys, error: allSurveysError } = await serviceClient
      .from('surveys')
      .select('id, user_id, title')
      .limit(100);
    
    if (allSurveysError) {
      console.log('❌ Erro ao buscar surveys:', allSurveysError.message);
    } else {
      console.log(`✅ Total de surveys no banco: ${allSurveys.length}`);
      
      // Agrupar por usuário
      const surveysByUser = {};
      allSurveys.forEach(survey => {
        if (!surveysByUser[survey.user_id]) {
          surveysByUser[survey.user_id] = [];
        }
        surveysByUser[survey.user_id].push(survey);
      });
      
      console.log(`📈 Usuários com surveys: ${Object.keys(surveysByUser).length}`);
      Object.entries(surveysByUser).forEach(([userId, surveys]) => {
        console.log(`  - ${userId}: ${surveys.length} surveys`);
      });
    }
    
    // 2. Testar cada conta
    for (const account of testAccounts) {
      console.log(`\n👤 Testando conta: ${account.email}`);
      
      const userClient = createClient(supabaseUrl, supabaseAnonKey);
      const accountResult = {
        email: account.email,
        login_success: false,
        user_id: null,
        surveys_visible: 0,
        own_surveys: 0,
        other_surveys: 0,
        isolation_violation: false,
        error_messages: []
      };
      
      try {
        // Tentar fazer login
        const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
          email: account.email,
          password: account.password
        });
        
        if (authError) {
          console.log(`❌ Falha no login: ${authError.message}`);
          accountResult.error_messages.push(`Login failed: ${authError.message}`);
          
          // Se a conta não existe, vamos tentar criar
          if (authError.message.includes('Invalid login credentials')) {
            console.log('🔄 Tentando criar nova conta...');
            
            const { data: signUpData, error: signUpError } = await userClient.auth.signUp({
              email: account.email,
              password: account.password
            });
            
            if (signUpError) {
              console.log(`❌ Erro ao criar conta: ${signUpError.message}`);
              accountResult.error_messages.push(`Signup failed: ${signUpError.message}`);
            } else {
              console.log(`✅ Conta criada com sucesso: ${signUpData.user?.id}`);
              
              // Aguardar um pouco para a conta ser processada
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Tentar fazer login novamente
              const { data: loginData, error: loginError } = await userClient.auth.signInWithPassword({
                email: account.email,
                password: account.password
              });
              
              if (loginError) {
                console.log(`❌ Erro no login após criação: ${loginError.message}`);
                accountResult.error_messages.push(`Login after signup failed: ${loginError.message}`);
              } else {
                console.log(`✅ Login bem-sucedido após criação: ${loginData.user.id}`);
                accountResult.login_success = true;
                accountResult.user_id = loginData.user.id;
                results.summary.successful_logins++;
              }
            }
          }
        } else {
          console.log(`✅ Login bem-sucedido: ${authData.user.id}`);
          accountResult.login_success = true;
          accountResult.user_id = authData.user.id;
          results.summary.successful_logins++;
        }
        
        // Se conseguiu fazer login, testar acesso aos dados
        if (accountResult.login_success && accountResult.user_id) {
          console.log('🔍 Testando acesso aos surveys...');
          
          const { data: userSurveys, error: surveysError } = await userClient
            .from('surveys')
            .select('id, title, user_id')
            .limit(50);
          
          if (surveysError) {
            console.log(`❌ Erro ao buscar surveys: ${surveysError.message}`);
            accountResult.error_messages.push(`Surveys query failed: ${surveysError.message}`);
          } else {
            accountResult.surveys_visible = userSurveys.length;
            
            // Verificar quantos são próprios vs de outros usuários
            const ownSurveys = userSurveys.filter(s => s.user_id === accountResult.user_id);
            const otherSurveys = userSurveys.filter(s => s.user_id !== accountResult.user_id);
            
            accountResult.own_surveys = ownSurveys.length;
            accountResult.other_surveys = otherSurveys.length;
            
            console.log(`📊 Surveys visíveis: ${userSurveys.length}`);
            console.log(`  - Próprios: ${ownSurveys.length}`);
            console.log(`  - De outros: ${otherSurveys.length}`);
            
            // Verificar violação de isolamento
            if (otherSurveys.length > 0) {
              console.log(`⚠️  VIOLAÇÃO DE ISOLAMENTO DETECTADA!`);
              accountResult.isolation_violation = true;
              results.summary.isolation_violations++;
              results.summary.rls_working = false;
              
              // Registrar detalhes da violação
              otherSurveys.slice(0, 3).forEach(survey => {
                console.log(`    - Survey "${survey.title}" (ID: ${survey.id}) pertence ao usuário ${survey.user_id}`);
                results.isolation_issues.push({
                  viewer_user_id: accountResult.user_id,
                  viewer_email: account.email,
                  survey_id: survey.id,
                  survey_title: survey.title,
                  survey_owner_id: survey.user_id
                });
              });
            } else {
              console.log(`✅ Isolamento funcionando corretamente`);
            }
          }
          
          // Testar inserção de um survey
          console.log('📝 Testando inserção de survey...');
          
          const testSurvey = {
            title: `Teste Isolamento ${Date.now()}`,
            description: 'Survey de teste para verificar isolamento RLS',
            user_id: accountResult.user_id,
            unique_link: `test-isolation-${Date.now()}`,
            max_responses: 50,
            status: 'active'
          };
          
          const { data: insertData, error: insertError } = await userClient
            .from('surveys')
            .insert(testSurvey)
            .select();
          
          if (insertError) {
            console.log(`❌ Erro ao inserir survey: ${insertError.message}`);
            accountResult.error_messages.push(`Insert failed: ${insertError.message}`);
          } else {
            console.log(`✅ Survey inserido com sucesso: ${insertData[0].id}`);
          }
        }
        
        await userClient.auth.signOut();
        
      } catch (error) {
        console.log(`❌ Erro durante teste da conta: ${error.message}`);
        accountResult.error_messages.push(`Account test error: ${error.message}`);
      }
      
      results.accounts_tested.push(accountResult);
    }
    
    // 3. Teste adicional: verificar se usuários anônimos podem acessar dados
    console.log('\n🔒 Testando acesso anônimo...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: anonSurveys, error: anonError } = await anonClient
      .from('surveys')
      .select('id, title')
      .limit(5);
    
    if (anonError) {
      console.log(`✅ Acesso anônimo bloqueado: ${anonError.message}`);
    } else {
      console.log(`⚠️  Usuários anônimos podem ver ${anonSurveys.length} surveys!`);
      results.summary.rls_working = false;
    }
    
    // 4. Resumo final
    console.log('\n📋 RESUMO DO TESTE DE ISOLAMENTO:');
    console.log(`✅ Contas testadas: ${results.summary.total_accounts}`);
    console.log(`✅ Logins bem-sucedidos: ${results.summary.successful_logins}`);
    console.log(`${results.summary.isolation_violations > 0 ? '❌' : '✅'} Violações de isolamento: ${results.summary.isolation_violations}`);
    console.log(`${results.summary.rls_working ? '✅' : '❌'} RLS funcionando: ${results.summary.rls_working}`);
    
    if (results.isolation_issues.length > 0) {
      console.log('\n⚠️  PROBLEMAS DE ISOLAMENTO DETECTADOS:');
      results.isolation_issues.forEach((issue, index) => {
        console.log(`${index + 1}. Usuário ${issue.viewer_email} pode ver survey "${issue.survey_title}" do usuário ${issue.survey_owner_id}`);
      });
    }
    
    // Salvar resultados
    fs.writeFileSync('isolation-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Resultados salvos em isolation-test-results.json');
    
  } catch (error) {
    console.error('❌ Erro crítico durante teste:', error);
    results.critical_error = error.message;
  }
  
  return results;
}

// Executar teste
testDataIsolation().catch(console.error);