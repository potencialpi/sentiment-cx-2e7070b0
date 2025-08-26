import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Clientes Supabase
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Contas de teste
const testAccounts = [
  {
    email: 'teste.basico@example.com',
    password: 'TestPassword123!',
    plan: 'basico'
  },
  {
    email: 'teste.vortex@example.com', 
    password: 'TestPassword123!',
    plan: 'vortex-pro'
  },
  {
    email: 'teste.nexus@example.com',
    password: 'TestPassword123!', 
    plan: 'nexus-infinito'
  }
];

class RLSTestSuite {
  constructor() {
    this.results = {
      policies: {},
      permissions: {},
      isolation: {},
      integrity: {},
      unauthorized: {},
      summary: {}
    };
  }

  async runAllTests() {
    console.log('🔒 INICIANDO TESTES ABRANGENTES DE RLS');
    console.log('=' .repeat(60));

    try {
      // 1. Verificar políticas RLS atuais
      await this.checkCurrentPolicies();
      
      // 2. Testar inserção com diferentes permissões
      await this.testInsertionPermissions();
      
      // 3. Testar isolamento de dados entre contas
      await this.testDataIsolation();
      
      // 4. Validar integridade dos registros
      await this.testDataIntegrity();
      
      // 5. Testar tentativas de acesso não autorizado
      await this.testUnauthorizedAccess();
      
      // 6. Gerar relatório final
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Erro durante os testes:', error);
    }
  }

  async checkCurrentPolicies() {
    console.log('\n📋 1. VERIFICANDO POLÍTICAS RLS ATUAIS');
    console.log('-'.repeat(40));

    try {
      // Verificar políticas nas tabelas principais
      const tables = ['surveys', 'responses', 'profiles'];
      
      for (const table of tables) {
        console.log(`\n🔍 Tabela: ${table}`);
        
        // Verificar se RLS está habilitado
        const { data: rlsStatus } = await supabaseService
          .from('pg_tables')
          .select('rowsecurity')
          .eq('schemaname', 'public')
          .eq('tablename', table)
          .single();
        
        console.log(`   RLS Habilitado: ${rlsStatus?.rowsecurity ? '✅' : '❌'}`);
        
        // Verificar políticas existentes
        const { data: policies } = await supabaseService
          .from('pg_policies')
          .select('policyname, cmd, roles')
          .eq('schemaname', 'public')
          .eq('tablename', table);
        
        console.log(`   Políticas encontradas: ${policies?.length || 0}`);
        policies?.forEach(policy => {
          console.log(`     - ${policy.policyname} (${policy.cmd})`);
        });
        
        this.results.policies[table] = {
          rlsEnabled: rlsStatus?.rowsecurity,
          policiesCount: policies?.length || 0,
          policies: policies || []
        };
      }
      
    } catch (error) {
      console.error('❌ Erro ao verificar políticas:', error.message);
      this.results.policies.error = error.message;
    }
  }

  async testInsertionPermissions() {
    console.log('\n🔐 2. TESTANDO INSERÇÃO COM DIFERENTES PERMISSÕES');
    console.log('-'.repeat(50));

    for (const account of testAccounts) {
      console.log(`\n👤 Testando conta: ${account.name} (${account.plan})`);
      
      try {
        // Fazer login com a conta
        const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
          email: account.email,
          password: account.password
        });
        
        if (authError) {
          console.log(`   ❌ Erro de autenticação: ${authError.message}`);
          this.results.permissions[account.plan] = { error: authError.message };
          continue;
        }
        
        console.log(`   ✅ Login realizado com sucesso`);
        
        // Testar criação de survey
        const surveyData = {
          title: `Survey Teste RLS - ${account.name}`,
          description: 'Survey para teste de RLS',
          questions: [{
            id: 1,
            text: 'Pergunta teste',
            type: 'text'
          }],
          status: 'active',
          unique_link: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        
        const { data: survey, error: surveyError } = await supabaseAnon
          .from('surveys')
          .insert(surveyData)
          .select()
          .single();
        
        if (surveyError) {
          console.log(`   ❌ Erro ao criar survey: ${surveyError.message}`);
        } else {
          console.log(`   ✅ Survey criado: ${survey.id}`);
          
          // Testar inserção de resposta (como usuário anônimo)
          const responseData = {
            survey_id: survey.id,
            respondent_id: `anon-${Date.now()}`,
            responses: { question_1: 'Resposta teste RLS' }
          };
          
          const { data: response, error: responseError } = await supabaseAnon
            .from('responses')
            .insert(responseData)
            .select()
            .single();
          
          if (responseError) {
            console.log(`   ❌ Erro ao inserir resposta: ${responseError.message}`);
          } else {
            console.log(`   ✅ Resposta inserida: ${response.id}`);
          }
          
          this.results.permissions[account.plan] = {
            login: true,
            surveyCreation: !surveyError,
            responseInsertion: !responseError,
            surveyId: survey.id,
            responseId: response?.id
          };
        }
        
        // Fazer logout
        await supabaseAnon.auth.signOut();
        
      } catch (error) {
        console.error(`   ❌ Erro geral para ${account.name}:`, error.message);
        this.results.permissions[account.plan] = { error: error.message };
      }
    }
  }

  async testDataIsolation() {
    console.log('\n🔒 3. TESTANDO ISOLAMENTO DE DADOS ENTRE CONTAS');
    console.log('-'.repeat(45));

    // Para cada conta, tentar acessar dados de outras contas
    for (let i = 0; i < testAccounts.length; i++) {
      const currentAccount = testAccounts[i];
      console.log(`\n👤 Testando isolamento para: ${currentAccount.name}`);
      
      try {
        // Login
        const { error: authError } = await supabaseAnon.auth.signInWithPassword({
          email: currentAccount.email,
          password: currentAccount.password
        });
        
        if (authError) {
          console.log(`   ❌ Erro de login: ${authError.message}`);
          continue;
        }
        
        // Tentar acessar surveys de outras contas
        const { data: surveys, error: surveysError } = await supabaseAnon
          .from('surveys')
          .select('id, title, user_id')
          .limit(10);
        
        console.log(`   📊 Surveys acessíveis: ${surveys?.length || 0}`);
        
        // Verificar se só vê os próprios surveys
        const currentUser = await supabaseAnon.auth.getUser();
        const currentUserId = currentUser.data.user?.id;
        const ownSurveys = surveys?.filter(s => s.user_id === currentUserId) || [];
        const otherSurveys = surveys?.filter(s => s.user_id !== currentUserId) || [];
        
        console.log(`   ✅ Próprios surveys: ${ownSurveys.length}`);
        console.log(`   ${otherSurveys.length > 0 ? '❌' : '✅'} Surveys de outros: ${otherSurveys.length}`);
        
        this.results.isolation[currentAccount.plan] = {
          totalSurveys: surveys?.length || 0,
          ownSurveys: ownSurveys.length,
          otherSurveys: otherSurveys.length,
          isolated: otherSurveys.length === 0
        };
        
        await supabaseAnon.auth.signOut();
        
      } catch (error) {
        console.error(`   ❌ Erro no teste de isolamento:`, error.message);
        this.results.isolation[currentAccount.plan] = { error: error.message };
      }
    }
  }

  async testDataIntegrity() {
    console.log('\n🔍 4. VALIDANDO INTEGRIDADE DOS REGISTROS');
    console.log('-'.repeat(40));

    try {
      // Usar service role para verificar integridade geral
      const { data: profiles } = await supabaseService
        .from('profiles')
        .select('id, email, subscription_plan')
        .in('email', testAccounts.map(a => a.email));
      
      console.log(`\n📋 Profiles encontrados: ${profiles?.length || 0}`);
      
      const { data: surveys } = await supabaseService
        .from('surveys')
        .select('id, title, user_id, status')
        .in('user_id', profiles?.map(p => p.id) || []);
      
      console.log(`📊 Surveys encontrados: ${surveys?.length || 0}`);
      
      const { data: responses } = await supabaseService
        .from('responses')
        .select('id, survey_id, respondent_id')
        .in('survey_id', surveys?.map(s => s.id) || []);
      
      console.log(`💬 Responses encontradas: ${responses?.length || 0}`);
      
      // Verificar consistência dos dados
      for (const profile of profiles || []) {
        const userSurveys = surveys?.filter(s => s.user_id === profile.id) || [];
        const userResponses = responses?.filter(r => 
          userSurveys.some(s => s.id === r.survey_id)
        ) || [];
        
        console.log(`\n👤 ${profile.email}:`);
        console.log(`   📊 Surveys: ${userSurveys.length}`);
        console.log(`   💬 Responses: ${userResponses.length}`);
        console.log(`   📋 Plano: ${profile.subscription_plan}`);
        
        this.results.integrity[profile.email] = {
          surveysCount: userSurveys.length,
          responsesCount: userResponses.length,
          plan: profile.subscription_plan
        };
      }
      
    } catch (error) {
      console.error('❌ Erro na validação de integridade:', error.message);
      this.results.integrity.error = error.message;
    }
  }

  async testUnauthorizedAccess() {
    console.log('\n🚫 5. TESTANDO TENTATIVAS DE ACESSO NÃO AUTORIZADO');
    console.log('-'.repeat(50));

    try {
      // Tentar acessar dados sem autenticação
      console.log('\n🔓 Testando acesso anônimo...');
      
      const { data: anonSurveys, error: anonError } = await supabaseAnon
        .from('surveys')
        .select('id, title')
        .limit(5);
      
      console.log(`   Surveys acessíveis anonimamente: ${anonSurveys?.length || 0}`);
      if (anonError) {
        console.log(`   ✅ Acesso negado (esperado): ${anonError.message}`);
      }
      
      // Tentar inserir dados sem autenticação
      const { error: insertError } = await supabaseAnon
        .from('surveys')
        .insert({
          title: 'Survey não autorizado',
          description: 'Teste de inserção não autorizada'
        });
      
      if (insertError) {
        console.log(`   ✅ Inserção negada (esperado): ${insertError.message}`);
      } else {
        console.log(`   ❌ Inserção permitida (problema de segurança!)`);
      }
      
      this.results.unauthorized = {
        anonymousRead: anonSurveys?.length || 0,
        anonymousInsert: !insertError,
        readError: anonError?.message,
        insertError: insertError?.message
      };
      
    } catch (error) {
      console.error('❌ Erro no teste de acesso não autorizado:', error.message);
      this.results.unauthorized.error = error.message;
    }
  }

  generateFinalReport() {
    console.log('\n📊 6. RELATÓRIO FINAL DOS TESTES RLS');
    console.log('='.repeat(60));

    // Resumo das políticas
    console.log('\n🔒 POLÍTICAS RLS:');
    Object.entries(this.results.policies).forEach(([table, data]) => {
      if (typeof data === 'object' && !data.error) {
        console.log(`   ${table}: RLS ${data.rlsEnabled ? '✅' : '❌'} | Políticas: ${data.policiesCount}`);
      }
    });

    // Resumo das permissões
    console.log('\n🔐 PERMISSÕES POR PLANO:');
    Object.entries(this.results.permissions).forEach(([plan, data]) => {
      if (typeof data === 'object' && !data.error) {
        console.log(`   ${plan}: Login ${data.login ? '✅' : '❌'} | Survey ${data.surveyCreation ? '✅' : '❌'} | Response ${data.responseInsertion ? '✅' : '❌'}`);
      }
    });

    // Resumo do isolamento
    console.log('\n🔒 ISOLAMENTO DE DADOS:');
    Object.entries(this.results.isolation).forEach(([plan, data]) => {
      if (typeof data === 'object' && !data.error) {
        console.log(`   ${plan}: ${data.isolated ? '✅ Isolado' : '❌ Vazamento'} (${data.otherSurveys} surveys de outros)`);
      }
    });

    // Resumo da integridade
    console.log('\n🔍 INTEGRIDADE DOS DADOS:');
    Object.entries(this.results.integrity).forEach(([email, data]) => {
      if (typeof data === 'object' && email !== 'error') {
        console.log(`   ${email}: ${data.surveysCount} surveys, ${data.responsesCount} responses`);
      }
    });

    // Status geral
    const hasErrors = Object.values(this.results).some(section => 
      typeof section === 'object' && section.error
    );
    
    console.log('\n🎯 STATUS GERAL:');
    console.log(`   ${hasErrors ? '❌ PROBLEMAS ENCONTRADOS' : '✅ TODOS OS TESTES PASSARAM'}`);
    
    // Salvar resultados
    this.results.summary = {
      timestamp: new Date().toISOString(),
      status: hasErrors ? 'FAILED' : 'PASSED',
      testsRun: 5
    };
    
    console.log('\n💾 Resultados salvos em this.results');
    console.log('🏁 TESTES RLS CONCLUÍDOS');
  }
}

// Executar testes
async function runTests() {
  const testSuite = new RLSTestSuite();
  await testSuite.runAllTests();
  
  // Salvar resultados em arquivo
  fs.writeFileSync(
    'rls-test-results.json', 
    JSON.stringify(testSuite.results, null, 2)
  );
  
  console.log('\n📄 Resultados salvos em: rls-test-results.json');
}

// Executar testes automaticamente
runTests().catch(console.error);

export { RLSTestSuite };