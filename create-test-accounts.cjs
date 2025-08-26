const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Clientes Supabase
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Contas de teste para criar
const testAccounts = [
  { email: 'teste.isolamento.forte1@example.com', password: 'TesteSuperSeguro123!@#' },
  { email: 'teste.isolamento.forte2@example.com', password: 'TesteSuperSeguro456!@#' },
  { email: 'teste.isolamento.forte3@example.com', password: 'TesteSuperSeguro789!@#' }
];

async function createTestAccounts() {
  console.log('👥 CRIANDO CONTAS DE TESTE PARA RLS');
  console.log('==================================\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    accountsCreated: [],
    accountsExisting: [],
    errors: [],
    surveysCreated: []
  };

  for (const account of testAccounts) {
    console.log(`\n📧 Criando conta: ${account.email}`);
    
    try {
      // Tentar criar a conta
      const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          emailRedirectTo: undefined // Evitar confirmação por email
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          console.log('ℹ️  Conta já existe, tentando fazer login...');
          
          // Tentar fazer login
          const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
            email: account.email,
            password: account.password
          });

          if (signInError) {
            console.log('❌ Erro no login:', signInError.message);
            results.errors.push({
              email: account.email,
              action: 'login',
              error: signInError.message
            });
          } else {
            console.log('✅ Login realizado com sucesso');
            results.accountsExisting.push({
              email: account.email,
              userId: signInData.user?.id,
              confirmed: signInData.user?.email_confirmed_at ? true : false
            });
            
            // Logout após teste
            await supabaseAnon.auth.signOut();
          }
        } else {
          console.log('❌ Erro na criação:', signUpError.message);
          results.errors.push({
            email: account.email,
            action: 'signup',
            error: signUpError.message
          });
        }
      } else {
        console.log('✅ Conta criada com sucesso');
        const userId = signUpData.user?.id;
        
        results.accountsCreated.push({
          email: account.email,
          userId: userId,
          confirmed: signUpData.user?.email_confirmed_at ? true : false
        });

        // Se a conta foi criada, confirmar o email usando service role
        if (userId && !signUpData.user?.email_confirmed_at) {
          console.log('📧 Confirmando email...');
          
          try {
            // Usar service role para confirmar o email
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
        }

        // Criar um survey de teste para esta conta
        console.log('📋 Criando survey de teste...');
        
        try {
          // Fazer login para criar o survey
          const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
            email: account.email,
            password: account.password
          });

          if (loginError) {
            console.log('⚠️  Não foi possível fazer login para criar survey:', loginError.message);
          } else {
            // Criar cliente autenticado
            const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
            await supabaseAuth.auth.setSession(loginData.session);

            // Criar survey
            const { data: surveyData, error: surveyError } = await supabaseAuth
              .from('surveys')
              .insert({
                title: `Survey de Teste - ${account.email}`,
                description: `Survey criado para testar isolamento RLS da conta ${account.email}`,
                user_id: userId,
                unique_link: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        } catch (surveyErr) {
          console.log('⚠️  Erro ao criar survey:', surveyErr.message);
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
  console.log('\n📊 RESUMO DA CRIAÇÃO DE CONTAS');
  console.log('==============================');
  console.log(`✅ Contas criadas: ${results.accountsCreated.length}`);
  console.log(`ℹ️  Contas existentes: ${results.accountsExisting.length}`);
  console.log(`📋 Surveys criados: ${results.surveysCreated.length}`);
  console.log(`❌ Erros: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Detalhes dos erros:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.email} (${error.action}): ${error.error}`);
    });
  }

  // Salvar resultados
  fs.writeFileSync('test-accounts-creation.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Resultados salvos em test-accounts-creation.json');
  
  return results;
}

// Executar criação
createTestAccounts().catch(console.error);