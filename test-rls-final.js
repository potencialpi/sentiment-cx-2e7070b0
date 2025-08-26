import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configurações do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Clientes Supabase
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Contas de teste
const testAccounts = [
  { email: 'teste.basico@example.com', password: 'SecureTest2025!@#', plan: 'basico' },
  { email: 'teste.vortex@example.com', password: 'VortexSecure2025!@#', plan: 'vortex-pro' },
  { email: 'teste.nexus@example.com', password: 'NexusSecure2025!@#', plan: 'nexus-infinito' }
];

class RLSTestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      rlsStatus: {},
      authTests: {},
      isolationTests: {},
      integrityTests: {},
      summary: {}
    };
  }

  async checkRLSStatus() {
    console.log('\n🔍 1. VERIFICANDO STATUS DAS POLÍTICAS RLS');
    console.log('----------------------------------------');
    
    try {
      // Verificar RLS habilitado
      const { data: rlsStatus, error: rlsError } = await supabaseAdmin
        .rpc('exec_sql', {
          query: `
            SELECT 
              tablename,
              rowsecurity as rls_enabled
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('surveys', 'responses', 'profiles')
            ORDER BY tablename;
          `
        });

      if (rlsError) {
        console.log('❌ Erro ao verificar RLS:', rlsError.message);
        return;
      }

      // Verificar políticas
      const { data: policies, error: policiesError } = await supabaseAdmin
        .rpc('exec_sql', {
          query: `
            SELECT 
              tablename,
              policyname,
              cmd
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename IN ('surveys', 'responses', 'profiles')
            ORDER BY tablename, policyname;
          `
        });

      if (policiesError) {
        console.log('❌ Erro ao verificar políticas:', policiesError.message);
        return;
      }

      // Processar resultados
      const tables = ['surveys', 'responses', 'profiles'];
      for (const table of tables) {
        const tableRLS = rlsStatus?.find(r => r.tablename === table);
        const tablePolicies = policies?.filter(p => p.tablename === table) || [];
        
        console.log(`\n🔍 Tabela: ${table}`);
        console.log(`   RLS Habilitado: ${tableRLS?.rls_enabled ? '✅' : '❌'}`);
        console.log(`   Políticas encontradas: ${tablePolicies.length}`);
        
        if (tablePolicies.length > 0) {
          tablePolicies.forEach(policy => {
            console.log(`   - ${policy.policyname} (${policy.cmd})`);
          });
        }

        this.results.rlsStatus[table] = {
          rlsEnabled: tableRLS?.rls_enabled || false,
          policiesCount: tablePolicies.length,
          policies: tablePolicies
        };
      }
    } catch (error) {
      console.log('❌ Erro geral:', error.message);
    }
  }

  async testAuthentication() {
    console.log('\n🔐 2. TESTANDO AUTENTICAÇÃO DAS CONTAS');
    console.log('--------------------------------------------------');

    for (const account of testAccounts) {
      try {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
          email: account.email,
          password: account.password
        });

        if (authError) {
          console.log(`👤 ${account.email} (${account.plan})`);
          console.log(`   ❌ Erro de autenticação: ${authError.message}`);
          
          this.results.authTests[account.plan] = {
            success: false,
            error: authError.message
          };
        } else {
          console.log(`👤 ${account.email} (${account.plan})`);
          console.log(`   ✅ Login realizado com sucesso`);
          console.log(`   👤 User ID: ${authData.user.id}`);
          
          this.results.authTests[account.plan] = {
            success: true,
            userId: authData.user.id,
            email: authData.user.email
          };

          // Testar inserção de survey
          await this.testSurveyInsertion(supabaseClient, account, authData.user.id);
        }
      } catch (error) {
        console.log(`👤 ${account.email} (${account.plan})`);
        console.log(`   ❌ Erro: ${error.message}`);
        
        this.results.authTests[account.plan] = {
          success: false,
          error: error.message
        };
      }
    }
  }

  async testSurveyInsertion(client, account, userId) {
    try {
      const surveyData = {
        user_id: userId,
        title: `Survey de Teste - ${account.plan}`,
        description: `Survey criado para testar RLS do plano ${account.plan}`,
        status: 'active'
      };

      const { data: survey, error: surveyError } = await client
        .from('surveys')
        .insert(surveyData)
        .select()
        .single();

      if (surveyError) {
        console.log(`   ❌ Erro ao inserir survey: ${surveyError.message}`);
        this.results.authTests[account.plan].surveyInsertion = {
          success: false,
          error: surveyError.message
        };
      } else {
        console.log(`   ✅ Survey criado: ${survey.id}`);
        this.results.authTests[account.plan].surveyInsertion = {
          success: true,
          surveyId: survey.id
        };
      }
    } catch (error) {
      console.log(`   ❌ Erro na inserção: ${error.message}`);
    }
  }

  async testDataIsolation() {
    console.log('\n🔒 3. TESTANDO ISOLAMENTO DE DADOS');
    console.log('---------------------------------------------');

    // Testar se cada usuário vê apenas seus próprios surveys
    for (const account of testAccounts) {
      if (this.results.authTests[account.plan]?.success) {
        try {
          const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
          
          await supabaseClient.auth.signInWithPassword({
            email: account.email,
            password: account.password
          });

          const { data: surveys, error } = await supabaseClient
            .from('surveys')
            .select('*');

          if (error) {
            console.log(`👤 ${account.plan}: ❌ Erro ao buscar surveys: ${error.message}`);
          } else {
            console.log(`👤 ${account.plan}: Pode ver ${surveys.length} survey(s)`);
            
            this.results.isolationTests[account.plan] = {
              surveysVisible: surveys.length,
              surveys: surveys.map(s => ({ id: s.id, title: s.title }))
            };
          }
        } catch (error) {
          console.log(`👤 ${account.plan}: ❌ Erro: ${error.message}`);
        }
      }
    }
  }

  async testAnonymousAccess() {
    console.log('\n🚫 4. TESTANDO ACESSO ANÔNIMO');
    console.log('--------------------------------------------------');

    try {
      // Testar leitura anônima
      const { data: surveys, error: readError } = await supabaseAnon
        .from('surveys')
        .select('*');

      if (readError) {
        console.log(`🔓 Leitura anônima: ❌ ${readError.message}`);
      } else {
        console.log(`🔓 Leitura anônima: ${surveys.length} surveys visíveis`);
      }

      // Testar inserção anônima (deve falhar)
      const { data: insertData, error: insertError } = await supabaseAnon
        .from('surveys')
        .insert({
          title: 'Survey Anônimo',
          description: 'Teste de inserção anônima',
          status: 'active'
        });

      if (insertError) {
        console.log(`🔓 Inserção anônima: ✅ Negada (esperado): ${insertError.message}`);
      } else {
        console.log(`🔓 Inserção anônima: ❌ Permitida (problema de segurança!)`);
      }

      this.results.anonymousAccess = {
        readAllowed: !readError,
        surveysVisible: surveys?.length || 0,
        insertBlocked: !!insertError,
        insertError: insertError?.message
      };
    } catch (error) {
      console.log(`❌ Erro no teste anônimo: ${error.message}`);
    }
  }

  generateSummary() {
    console.log('\n📊 5. RELATÓRIO FINAL DOS TESTES RLS');
    console.log('============================================================');

    // Status das políticas RLS
    console.log('\n🔒 POLÍTICAS RLS:');
    Object.entries(this.results.rlsStatus).forEach(([table, status]) => {
      console.log(`   ${table}: RLS ${status.rlsEnabled ? '✅' : '❌'} | Políticas: ${status.policiesCount}`);
    });

    // Autenticação
    console.log('\n🔐 AUTENTICAÇÃO:');
    Object.entries(this.results.authTests).forEach(([plan, result]) => {
      console.log(`   ${plan}: ${result.success ? '✅' : '❌'} ${result.success ? result.email : result.error}`);
    });

    // Isolamento
    console.log('\n🔒 ISOLAMENTO DE DADOS:');
    Object.entries(this.results.isolationTests).forEach(([plan, result]) => {
      console.log(`   ${plan}: ${result.surveysVisible} survey(s) visível(is)`);
    });

    // Determinar status geral
    const rlsEnabled = Object.values(this.results.rlsStatus).every(s => s.rlsEnabled);
    const authWorking = Object.values(this.results.authTests).some(a => a.success);
    const isolationWorking = Object.keys(this.results.isolationTests).length > 0;

    this.results.summary = {
      rlsEnabled,
      authWorking,
      isolationWorking,
      overallStatus: rlsEnabled && authWorking ? 'PASSED' : 'NEEDS_ATTENTION'
    };

    console.log('\n🎯 STATUS GERAL:');
    console.log(`   ${this.results.summary.overallStatus === 'PASSED' ? '✅' : '⚠️'} ${this.results.summary.overallStatus}`);
  }

  async saveResults() {
    const filename = 'rls-test-results-final.json';
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Resultados salvos em: ${filename}`);
  }

  async runAllTests() {
    console.log('🔐 INICIANDO TESTES ABRANGENTES DE RLS');
    console.log('============================================================');

    await this.checkRLSStatus();
    await this.testAuthentication();
    await this.testDataIsolation();
    await this.testAnonymousAccess();
    this.generateSummary();
    await this.saveResults();

    console.log('\n🏁 TESTES RLS CONCLUÍDOS');
  }
}

// Executar testes
const testRunner = new RLSTestRunner();
testRunner.runAllTests().catch(console.error);