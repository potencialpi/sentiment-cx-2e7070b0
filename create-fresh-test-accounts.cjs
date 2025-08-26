const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Clientes Supabase
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Gerar timestamp único para evitar conflitos
const timestamp = Date.now();

// Contas de teste com emails únicos
const testAccounts = [
  { email: `rls.test.user1.${timestamp}@example.com`, password: 'TesteSuperSeguro123!@#' },
  { email: `rls.test.user2.${timestamp}@example.com`, password: 'TesteSuperSeguro456!@#' },
  { email: `rls.test.user3.${timestamp}@example.com`, password: 'TesteSuperSeguro789!@#' }
];

async function createFreshTestAccounts() {
  console.log('👥 CRIANDO CONTAS FRESCAS PARA TESTE RLS');
  console.log('======================================\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    testTimestamp: timestamp,
    accountsCreated: [],
    surveysCreated: [],
    errors: []
  };

  for (let i = 0; i < testAccounts.length; i++) {
    const account = testAccounts[i];
    console.log(`\n📧 Criando conta ${i + 1}/3: ${account.email}`);
    
    try {
      // Criar a conta
      const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
        email: account.email,
        password: account.password
      });

      if (signUpError) {
        console.log('❌ Erro na criação:', signUpError.message);
        results.errors.push({
          email: account.email,
          action: 'signup',
          error: signUpError.message
        });
        continue;
      }

      const userId = signUpData.user?.id;
      console.log('✅ Conta criada com sucesso');
      console.log('   User ID:', userId);
      
      results.accountsCreated.push({
        email: account.email,
        userId: userId,
        password: account.password // Salvar para testes posteriores
      });

      // Confirmar email usando service role
      if (userId) {
        console.log('📧 Confirmando email...');
        
        try {
          const { error: confirmError } = await supabaseService.auth.admin.updateUserById(
            userId,
            { email_confirm: true }
          );
          
          if (confirmError) {
            console.log('⚠️  Erro ao confirmar email:', confirmError.message);
          } else {
            console.log('✅ Email confirmado');
          }
        } catch (confirmErr) {
          console.log('⚠️  Erro ao confirmar email:', confirmErr.message);
        }

        // Aguardar um pouco antes de tentar fazer login
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Fazer login para criar survey
        console.log('🔑 Fazendo login para criar survey...');
        
        const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
          email: account.email,
          password: account.password
        });

        if (loginError) {
          console.log('⚠️  Erro no login:', loginError.message);
        } else {
          console.log('✅ Login realizado com sucesso');
          
          // Criar cliente autenticado
          const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
          await supabaseAuth.auth.setSession(loginData.session);

          // Criar survey de teste
          console.log('📋 Criando survey de teste...');
          
          const { data: surveyData, error: surveyError } = await supabaseAuth
            .from('surveys')
            .insert({
              title: `Survey RLS Test ${i + 1} - ${timestamp}`,
              description: `Survey para testar isolamento RLS - Usuário ${i + 1}`,
              user_id: userId,
              unique_link: `rls-test-${timestamp}-${i + 1}-${Math.random().toString(36).substr(2, 9)}`,
              max_responses: 100,
              current_responses: 0,
              status: 'active'
            })
            .select()
            .single();

          if (surveyError) {
            console.log('⚠️  Erro ao criar survey:', surveyError.message);
          } else {
            console.log('✅ Survey criado:', surveyData.id);
            results.surveysCreated.push({
              email: account.email,
              userId: userId,
              surveyId: surveyData.id,
              title: surveyData.title
            });
          }

          // Logout
          await supabaseAuth.auth.signOut();
        }
      }
    } catch (error) {
      console.log('❌ Erro geral:', error.message);
      results.errors.push({
        email: account.email,
        action: 'general',
        error: error.message
      });
    }
  }

  // Resumo
  console.log('\n📊 RESUMO DA CRIAÇÃO');
  console.log('====================');
  console.log(`✅ Contas criadas: ${results.accountsCreated.length}`);
  console.log(`📋 Surveys criados: ${results.surveysCreated.length}`);
  console.log(`❌ Erros: ${results.errors.length}`);

  if (results.accountsCreated.length > 0) {
    console.log('\n👥 Contas criadas com sucesso:');
    results.accountsCreated.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.email}`);
      console.log(`      User ID: ${account.userId}`);
      console.log(`      Password: ${account.password}`);
    });
  }

  if (results.surveysCreated.length > 0) {
    console.log('\n📋 Surveys criados:');
    results.surveysCreated.forEach((survey, index) => {
      console.log(`   ${index + 1}. ${survey.title} (ID: ${survey.surveyId})`);
      console.log(`      Owner: ${survey.email}`);
    });
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Erros encontrados:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.email} (${error.action}): ${error.error}`);
    });
  }

  // Salvar resultados
  fs.writeFileSync('fresh-test-accounts.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Resultados salvos em fresh-test-accounts.json');
  
  // Se tudo deu certo, executar teste de isolamento
  if (results.accountsCreated.length >= 2) {
    console.log('\n🧪 INICIANDO TESTE DE ISOLAMENTO RLS');
    console.log('===================================');
    
    await testRLSIsolation(results.accountsCreated);
  } else {
    console.log('\n⚠️  Não foi possível criar contas suficientes para testar isolamento');
  }
  
  return results;
}

async function testRLSIsolation(accounts) {
  const isolationResults = {
    timestamp: new Date().toISOString(),
    testResults: [],
    totalViolations: 0,
    rlsWorking: false
  };

  for (const account of accounts) {
    console.log(`\n👤 Testando isolamento: ${account.email}`);
    
    const testResult = {
      email: account.email,
      userId: account.userId,
      loginSuccess: false,
      surveysVisible: 0,
      ownSurveys: 0,
      otherUserSurveys: 0,
      violationDetails: []
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
          const ownSurveys = userSurveys?.filter(s => s.user_id === account.userId) || [];
          const otherSurveys = userSurveys?.filter(s => s.user_id !== account.userId) || [];
          
          testResult.ownSurveys = ownSurveys.length;
          testResult.otherUserSurveys = otherSurveys.length;
          
          console.log('   - Próprios surveys:', testResult.ownSurveys);
          console.log('   - Surveys de outros:', testResult.otherUserSurveys);
          
          if (testResult.otherUserSurveys > 0) {
            console.log('❌ VIOLAÇÃO DE ISOLAMENTO DETECTADA!');
            isolationResults.totalViolations += testResult.otherUserSurveys;
            
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

    isolationResults.testResults.push(testResult);
  }

  // Análise final
  console.log('\n📋 RESULTADO FINAL DO TESTE RLS');
  console.log('===============================');
  
  const successfulLogins = isolationResults.testResults.filter(r => r.loginSuccess).length;
  const violationsFound = isolationResults.totalViolations;
  
  console.log(`✅ Logins bem-sucedidos: ${successfulLogins}/${accounts.length}`);
  console.log(`❌ Total de violações: ${violationsFound}`);
  
  if (violationsFound === 0 && successfulLogins > 0) {
    console.log('🎉 RLS FUNCIONANDO PERFEITAMENTE!');
    console.log('✅ Cada usuário vê apenas seus próprios surveys');
    isolationResults.rlsWorking = true;
  } else {
    console.log('⚠️  PROBLEMAS DETECTADOS NO RLS');
    isolationResults.rlsWorking = false;
    
    if (violationsFound > 0) {
      console.log(`❌ ${violationsFound} violações de isolamento encontradas`);
    }
    if (successfulLogins === 0) {
      console.log('❌ Nenhum login de teste foi bem-sucedido');
    }
  }

  // Salvar resultados do teste de isolamento
  fs.writeFileSync('rls-isolation-final-test.json', JSON.stringify(isolationResults, null, 2));
  console.log('\n💾 Resultados do teste RLS salvos em rls-isolation-final-test.json');
  
  return isolationResults;
}

// Executar criação e teste
createFreshTestAccounts().catch(console.error);