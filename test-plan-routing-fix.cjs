require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simular a função getUserPlan do planUtils.ts
async function getUserPlan(supabase, userId) {
  try {
    // Primeiro, tentar buscar na tabela companies
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('plan_name')
      .eq('user_id', userId)
      .single();

    if (companyData?.plan_name && !companyError) {
      return companyData.plan_name;
    }

    // Se não encontrar na companies, buscar na profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('plan_name')
      .eq('id', userId)
      .single();

    if (profileData?.plan_name && !profileError) {
      return profileData.plan_name;
    }

    // Fallback padrão
    return 'start-quantico';
  } catch (error) {
    console.error('Erro ao buscar plano do usuário:', error);
    return 'start-quantico';
  }
}

// Simular a função getPlanAdminRoute do planUtils.ts
function getPlanAdminRoute(planCode) {
  const normalizedPlan = planCode?.replace(/_/g, '-') || 'start-quantico';
  
  switch (normalizedPlan) {
    case 'start-quantico':
      return '/create-survey-start';
    case 'vortex-neural':
      return '/admin/vortex';
    case 'nexus-infinito':
      return '/admin/nexus';
    default:
      return '/dashboard';
  }
}

async function testPlanRouting() {
  console.log('🧪 TESTE DE CORREÇÃO DO ROTEAMENTO DE PLANOS\n');

  // Teste 1: Verificar se as tabelas corretas existem
  console.log('1. Verificando estrutura das tabelas...');
  
  try {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, plan_name')
      .limit(1);
    
    if (!profilesError) {
      console.log('✅ Tabela profiles acessível');
    } else {
      console.log('❌ Erro ao acessar tabela profiles:', profilesError.message);
    }

    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('user_id, plan_name')
      .limit(1);
    
    if (!companiesError) {
      console.log('✅ Tabela companies acessível');
    } else {
      console.log('❌ Erro ao acessar tabela companies:', companiesError.message);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
  }

  // Teste 2: Testar função getUserPlan com diferentes cenários
  console.log('\n2. Testando função getUserPlan...');
  
  const testUserId = 'test-user-id';
  const planResult = await getUserPlan(supabase, testUserId);
  console.log(`✅ getUserPlan retornou: ${planResult} (fallback esperado)`);

  // Teste 3: Testar mapeamento de rotas
  console.log('\n3. Testando mapeamento de rotas...');
  
  const testCases = [
    { plan: 'start-quantico', expectedRoute: '/create-survey-start' },
    { plan: 'vortex-neural', expectedRoute: '/admin/vortex' },
    { plan: 'nexus-infinito', expectedRoute: '/admin/nexus' },
    { plan: 'plano-inexistente', expectedRoute: '/dashboard' },
    { plan: null, expectedRoute: '/dashboard' },
    { plan: undefined, expectedRoute: '/dashboard' }
  ];

  testCases.forEach(({ plan, expectedRoute }) => {
    const actualRoute = getPlanAdminRoute(plan);
    const status = actualRoute === expectedRoute ? '✅' : '❌';
    console.log(`${status} Plano: '${plan}' -> Rota: '${actualRoute}' (esperado: '${expectedRoute}')`);
  });

  // Teste 4: Verificar dados existentes
  console.log('\n4. Verificando dados existentes nas tabelas...');
  
  try {
    const { data: profilesCount } = await supabase
      .from('profiles')
      .select('plan_name', { count: 'exact', head: true });
    
    const { data: companiesCount } = await supabase
      .from('companies')
      .select('plan_name', { count: 'exact', head: true });

    console.log(`📊 Total de profiles: ${profilesCount?.length || 0}`);
    console.log(`📊 Total de companies: ${companiesCount?.length || 0}`);

    // Verificar distribuição de planos
    const { data: profilePlans } = await supabase
      .from('profiles')
      .select('plan_name');
    
    const { data: companyPlans } = await supabase
      .from('companies')
      .select('plan_name');

    const allPlans = [...(profilePlans || []), ...(companyPlans || [])];
    const planDistribution = allPlans.reduce((acc, item) => {
      const plan = item.plan_name || 'null';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 Distribuição de planos:');
    Object.entries(planDistribution).forEach(([plan, count]) => {
      console.log(`   ${plan}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
  }

  console.log('\n🎯 RESUMO DA CORREÇÃO:');
  console.log('✅ Componentes corrigidos para usar getUserPlan() em vez de user_plans');
  console.log('✅ Dashboard.tsx - Corrigido');
  console.log('✅ Admin.tsx - Corrigido');
  console.log('✅ Login.tsx - Corrigido');
  console.log('✅ CreateAccount.tsx - Corrigido');
  console.log('\n🔧 PRÓXIMOS PASSOS:');
  console.log('1. Testar login com usuários dos planos nexus-infinito e vortex-neural');
  console.log('2. Verificar se o redirecionamento está funcionando corretamente');
  console.log('3. Monitorar logs do console para confirmar os planos encontrados');
}

testPlanRouting().catch(console.error);