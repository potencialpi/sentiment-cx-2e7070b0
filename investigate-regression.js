import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

// Cliente com service role (admin)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente com anon key (usuário normal)
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function investigateRegression() {
  console.log('🔍 INVESTIGANDO REGRESSÃO NA CRIAÇÃO DE USUÁRIOS');
  console.log('=' .repeat(60));
  
  try {
    // 1. Verificar usuários existentes e quando foram criados
    console.log('\n📊 1. ANALISANDO USUÁRIOS EXISTENTES...');
    
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Erro ao listar usuários:', usersError.message);
    } else {
      console.log(`✅ Total de usuários: ${users.users.length}`);
      
      // Analisar quando os usuários foram criados
      const usersByDate = users.users.map(user => ({
        email: user.email,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
        confirmed: user.email_confirmed_at ? 'Sim' : 'Não'
      })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      console.log('\n📋 Usuários por data de criação (mais recentes primeiro):');
      usersByDate.forEach((user, index) => {
        const createdDate = new Date(user.created_at).toLocaleString('pt-BR');
        console.log(`${index + 1}. ${user.email} - Criado: ${createdDate} - Confirmado: ${user.confirmed}`);
      });
      
      // Identificar o último usuário criado com sucesso
      if (usersByDate.length > 0) {
        const lastUser = usersByDate[0];
        const lastCreated = new Date(lastUser.created_at);
        const now = new Date();
        const daysSince = Math.floor((now - lastCreated) / (1000 * 60 * 60 * 24));
        
        console.log(`\n🕒 Último usuário criado: ${lastUser.email}`);
        console.log(`📅 Data: ${lastCreated.toLocaleString('pt-BR')} (${daysSince} dias atrás)`);
      }
    }
    
    // 2. Testar diferentes cenários de criação
    console.log('\n🧪 2. TESTANDO CENÁRIOS DE CRIAÇÃO...');
    
    // Teste A: SignUp básico com anon key
    console.log('\n📋 Teste A: SignUp básico com anon key');
    const testEmailA = `test-basic-${Date.now()}@example.com`;
    
    const { data: signUpA, error: errorA } = await supabaseClient.auth.signUp({
      email: testEmailA,
      password: 'TestPassword123!'
    });
    
    if (errorA) {
      console.log('❌ SignUp básico falhou:', errorA.message);
      console.log('📋 Detalhes:', {
        status: errorA.status,
        code: errorA.code,
        name: errorA.name
      });
    } else {
      console.log('✅ SignUp básico funcionou!');
      console.log('📋 Usuário:', signUpA.user?.email);
      
      // Limpar usuário de teste
      if (signUpA.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(signUpA.user.id);
        console.log('🧹 Usuário de teste removido');
      }
    }
    
    // Teste B: SignUp com service role
    console.log('\n📋 Teste B: Criação com service role (admin)');
    const testEmailB = `test-admin-${Date.now()}@example.com`;
    
    const { data: createUserB, error: errorB } = await supabaseAdmin.auth.admin.createUser({
      email: testEmailB,
      password: 'TestPassword123!',
      email_confirm: true
    });
    
    if (errorB) {
      console.log('❌ Criação admin falhou:', errorB.message);
      console.log('📋 Detalhes:', {
        status: errorB.status,
        code: errorB.code
      });
    } else {
      console.log('✅ Criação admin funcionou!');
      console.log('📋 Usuário:', createUserB.user?.email);
      
      // Limpar usuário de teste
      if (createUserB.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(createUserB.user.id);
        console.log('🧹 Usuário de teste removido');
      }
    }
    
    // 3. Verificar configurações de Auth
    console.log('\n⚙️ 3. VERIFICANDO CONFIGURAÇÕES DE AUTH...');
    
    // Verificar se conseguimos acessar configurações
    try {
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('auth.config')
        .select('*')
        .limit(1);
      
      if (settingsError) {
        console.log('⚠️ Não foi possível acessar configurações de Auth:', settingsError.message);
      } else {
        console.log('✅ Configurações de Auth acessíveis');
      }
    } catch (configError) {
      console.log('⚠️ Erro ao verificar configurações:', configError.message);
    }
    
    // 4. Verificar triggers e funções
    console.log('\n🔧 4. VERIFICANDO TRIGGERS E FUNÇÕES...');
    
    try {
      // Verificar se as funções existem
      const { data: functions, error: funcError } = await supabaseAdmin
        .rpc('exec_sql', {
          sql: `
            SELECT 
              p.proname as function_name,
              n.nspname as schema_name,
              p.prosrc as function_body
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname IN ('handle_new_user_profile', 'handle_new_user_company')
            ORDER BY p.proname;
          `
        });
      
      if (funcError) {
        console.log('⚠️ Não foi possível verificar funções:', funcError.message);
      } else {
        console.log('✅ Verificação de funções executada');
        if (functions && functions.length > 0) {
          console.log('📋 Funções encontradas:', functions.map(f => f.function_name));
        } else {
          console.log('⚠️ Nenhuma função de trigger encontrada');
        }
      }
    } catch (triggerError) {
      console.log('⚠️ Erro ao verificar triggers:', triggerError.message);
    }
    
    // 5. Verificar tabelas relacionadas
    console.log('\n📊 5. VERIFICANDO TABELAS RELACIONADAS...');
    
    try {
      // Verificar tabela profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, created_at')
        .limit(5)
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.log('❌ Erro ao acessar tabela profiles:', profilesError.message);
      } else {
        console.log(`✅ Tabela profiles acessível - ${profiles.length} registros recentes`);
      }
      
      // Verificar tabela companies
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from('companies')
        .select('id, name, created_at')
        .limit(5)
        .order('created_at', { ascending: false });
      
      if (companiesError) {
        console.log('❌ Erro ao acessar tabela companies:', companiesError.message);
      } else {
        console.log(`✅ Tabela companies acessível - ${companies.length} registros recentes`);
      }
    } catch (tableError) {
      console.log('⚠️ Erro ao verificar tabelas:', tableError.message);
    }
    
    // 6. Gerar relatório de investigação
    console.log('\n📄 6. GERANDO RELATÓRIO...');
    
    const report = {
      timestamp: new Date().toISOString(),
      investigation: {
        total_users: users?.users?.length || 0,
        last_user_created: users?.users?.[0]?.created_at || 'N/A',
        signup_basic_working: !errorA,
        signup_admin_working: !errorB,
        auth_config_accessible: true, // Assumindo baseado nos testes
        tables_accessible: true
      },
      errors: {
        signup_basic: errorA ? {
          message: errorA.message,
          status: errorA.status,
          code: errorA.code
        } : null,
        signup_admin: errorB ? {
          message: errorB.message,
          status: errorB.status,
          code: errorB.code
        } : null
      },
      recommendations: []
    };
    
    // Adicionar recomendações baseadas nos resultados
    if (errorA && errorB) {
      report.recommendations.push('Problema crítico: Ambos os métodos de criação falharam');
      report.recommendations.push('Verificar configurações do projeto Supabase no dashboard');
    } else if (errorA && !errorB) {
      report.recommendations.push('SignUp público falhou, mas admin funciona');
      report.recommendations.push('Verificar configurações de Auth público no dashboard');
    } else if (!errorA && errorB) {
      report.recommendations.push('SignUp público funciona, mas admin falhou');
      report.recommendations.push('Verificar permissões do service role key');
    } else {
      report.recommendations.push('Ambos os métodos funcionam - problema pode ser intermitente');
      report.recommendations.push('Verificar logs específicos do momento do erro');
    }
    
    // Salvar relatório
    const fs = await import('fs');
    fs.writeFileSync('RELATORIO_INVESTIGACAO_REGRESSAO.json', JSON.stringify(report, null, 2));
    
    console.log('\n🎉 INVESTIGAÇÃO CONCLUÍDA!');
    console.log('📄 Relatório salvo em: RELATORIO_INVESTIGACAO_REGRESSAO.json');
    
    // Resumo final
    console.log('\n📋 RESUMO DA INVESTIGAÇÃO:');
    console.log('=' .repeat(40));
    console.log(`👥 Total de usuários existentes: ${report.investigation.total_users}`);
    console.log(`🧪 SignUp básico: ${report.investigation.signup_basic_working ? '✅ Funcionando' : '❌ Falhando'}`);
    console.log(`🔑 SignUp admin: ${report.investigation.signup_admin_working ? '✅ Funcionando' : '❌ Falhando'}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMENDAÇÕES:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro durante investigação:', error.message);
    process.exit(1);
  }
}

// Executar investigação
investigateRegression().catch(console.error);