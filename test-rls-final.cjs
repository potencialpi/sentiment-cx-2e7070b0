const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Clientes Supabase
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Contas de teste
const testAccounts = [
  { email: 'teste.isolamento.forte1@example.com', password: 'TesteSuperSeguro123!@#' },
  { email: 'teste.isolamento.forte2@example.com', password: 'TesteSuperSeguro456!@#' },
  { email: 'teste.isolamento.forte3@example.com', password: 'TesteSuperSeguro789!@#' }
];

async function testRLSFinal() {
  console.log('🔒 TESTE FINAL DE ISOLAMENTO RLS');
  console.log('================================\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    rlsStatus: {},
    policyCount: {},
    testResults: [],
    summary: {
      totalViolations: 0,
      rlsWorking: false,
      criticalIssues: []
    }
  };

  try {
    // 1. Verificar status RLS usando a função criada
    console.log('📋 Verificando status RLS...');
    const { data: rlsTest, error: rlsError } = await supabaseService
      .rpc('test_rls_isolation');
    
    if (rlsError) {
      console.log('❌ Erro ao verificar RLS:', rlsError.message);
      results.summary.criticalIssues.push('Não foi possível verificar status RLS');
    } else {
      console.log('✅ Status RLS obtido:', rlsTest?.length || 0, 'resultados');
      results.rlsStatus = rlsTest || [];
      
      // Contar políticas por tabela
      rlsTest?.forEach(test => {
        if (test.test_name === 'Policy Count') {
          const tableName = test.details.replace('Table: ', '');
          results.policyCount[tableName] = parseInt(test.result);
        }
      });
    }

    // 2. Testar acesso anônimo (deve ser bloqueado)
    console.log('\n🚫 Testando acesso anônimo...');
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('surveys')
      .select('*');
    
    if (anonError) {
      console.log('✅ Acesso anônimo bloqueado:', anonError.message);
    } else {
      console.log('❌ CRÍTICO: Acesso anônimo permitido! Encontrados', anonData?.length || 0, 'surveys');
      results.summary.criticalIssues.push('Acesso anônimo não está bloqueado');
      results.summary.totalViolations += anonData?.length || 0;
    }

    // 3. Obter todos os surveys usando service role para comparação
    console.log('\n📊 Obtendo dados de referência...');
    const { data: allSurveys, error: allError } = await supabaseService
      .from('surveys')
      .select('id, user_id, title');
    
    if (allError) {
      console.log('❌ Erro ao obter surveys:', allError.message);
      results.summary.criticalIssues.push('Não foi possível obter dados de referência');
    } else {
      console.log('📈 Total de surveys no banco:', allSurveys?.length || 0);
      
      // Agrupar por usuário
      const surveysByUser = {};
      allSurveys?.forEach(survey => {
        if (!surveysByUser[survey.user_id]) {
          surveysByUser[survey.user_id] = [];
        }
        surveysByUser[survey.user_id].push(survey);
      });
      
      console.log('👥 Usuários com surveys:', Object.keys(surveysByUser).length);
      Object.entries(surveysByUser).forEach(([userId, surveys]) => {
        console.log(`   - ${userId}: ${surveys.length} surveys`);
      });
    }

    // 4. Testar isolamento para cada conta
    console.log('\n🧪 Testando isolamento por conta...');
    
    for (const account of testAccounts) {
      console.log(`\n👤 Testando: ${account.email}`);
      
      const testResult = {
        email: account.email,
        loginSuccess: false,
        surveysVisible: 0,
        ownSurveys: 0,
        otherUserSurveys: 0,
        violationDetails: [],
        userId: null
      };

      try {
        // Login
        const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
          email: account.email,
          password: account.password
        });

        if (authError) {
          console.log('❌ Falha no login:', authError.message);
          testResult.loginSuccess = false;
        } else {
          console.log('✅ Login realizado com sucesso');
          testResult.loginSuccess = true;
          testResult.userId = authData.user?.id;

          // Criar cliente autenticado
          const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
          await supabaseAuth.auth.setSession(authData.session);

          // Tentar acessar surveys
          const { data: userSurveys, error: surveyError } = await supabaseAuth
            .from('surveys')
            .select('id, user_id, title');

          if (surveyError) {
            console.log('✅ Acesso a surveys bloqueado:', surveyError.message);
          } else {
            testResult.surveysVisible = userSurveys?.length || 0;
            console.log('📊 Surveys visíveis:', testResult.surveysVisible);

            // Verificar se são apenas os próprios surveys
            const ownSurveys = userSurveys?.filter(s => s.user_id === testResult.userId) || [];
            const otherSurveys = userSurveys?.filter(s => s.user_id !== testResult.userId) || [];
            
            testResult.ownSurveys = ownSurveys.length;
            testResult.otherUserSurveys = otherSurveys.length;
            
            console.log('   - Próprios surveys:', testResult.ownSurveys);
            console.log('   - Surveys de outros:', testResult.otherUserSurveys);
            
            if (testResult.otherUserSurveys > 0) {
              console.log('❌ VIOLAÇÃO DE ISOLAMENTO DETECTADA!');
              results.summary.totalViolations += testResult.otherUserSurveys;
              
              otherSurveys.forEach(survey => {
                testResult.violationDetails.push({
                  surveyId: survey.id,
                  ownerId: survey.user_id,
                  title: survey.title
                });
                console.log(`   ⚠️  Survey ${survey.id} pertence a ${survey.user_id}`);
              });
            } else {
              console.log('✅ Isolamento funcionando corretamente');
            }
          }

          // Logout
          await supabaseAuth.auth.signOut();
        }
      } catch (error) {
        console.log('❌ Erro no teste:', error.message);
        testResult.error = error.message;
      }

      results.testResults.push(testResult);
    }

    // 5. Análise final
    console.log('\n📋 ANÁLISE FINAL');
    console.log('================');
    
    const successfulLogins = results.testResults.filter(r => r.loginSuccess).length;
    const violationsFound = results.summary.totalViolations;
    
    console.log(`✅ Logins bem-sucedidos: ${successfulLogins}/${testAccounts.length}`);
    console.log(`❌ Total de violações: ${violationsFound}`);
    
    if (violationsFound === 0 && successfulLogins > 0) {
      console.log('🎉 RLS FUNCIONANDO CORRETAMENTE!');
      results.summary.rlsWorking = true;
    } else {
      console.log('⚠️  RLS NÃO ESTÁ FUNCIONANDO ADEQUADAMENTE');
      results.summary.rlsWorking = false;
      
      if (violationsFound > 0) {
        results.summary.criticalIssues.push(`${violationsFound} violações de isolamento detectadas`);
      }
      if (successfulLogins === 0) {
        results.summary.criticalIssues.push('Nenhum login de teste foi bem-sucedido');
      }
    }
    
    // Verificar políticas
    const totalPolicies = Object.values(results.policyCount).reduce((sum, count) => sum + count, 0);
    console.log(`📋 Total de políticas RLS: ${totalPolicies}`);
    
    if (totalPolicies === 0) {
      results.summary.criticalIssues.push('Nenhuma política RLS encontrada');
    }

    console.log('\n🔍 Problemas críticos identificados:');
    if (results.summary.criticalIssues.length === 0) {
      console.log('   ✅ Nenhum problema crítico encontrado');
    } else {
      results.summary.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
    results.summary.criticalIssues.push(`Erro geral: ${error.message}`);
  }

  // Salvar resultados
  fs.writeFileSync('rls-final-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Resultados salvos em rls-final-test-results.json');
  
  return results;
}

// Executar teste
testRLSFinal().catch(console.error);