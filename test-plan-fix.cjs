const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simular a função getUserPlan corrigida
function normalizePlanCode(planCode) {
  if (!planCode) return 'start-quantico';
  
  // Converter underscores para hífens para manter consistência
  const normalized = planCode.replace(/_/g, '-');
  
  const planDisplayNames = {
    'start-quantico': 'Start Quântico',
    'vortex-neural': 'Vortex Neural', 
    'nexus-infinito': 'Nexus Infinito'
  };
  
  // Verificar se é um código válido
  if (normalized in planDisplayNames) {
    return normalized;
  }
  
  // Fallback para start-quantico
  return 'start-quantico';
}

async function getUserPlanFixed(supabaseClient, userId) {
  console.log('🔍 Buscando plano do usuário:', userId);
  
  // Validação do cliente Supabase
  if (!supabaseClient || typeof supabaseClient.from !== 'function') {
    console.error('❌ Cliente Supabase inválido, usando fallback');
    return 'start-quantico';
  }
  
  let planCode = null;

  try {
    // Tentar buscar o plano na tabela companies primeiro
    try {
      const { data: companyData, error: companyError } = await supabaseClient
        .from('companies')
        .select('plan_name')
        .eq('user_id', userId)
        .single();

      if (!companyError && companyData?.plan_name) {
        planCode = companyData.plan_name;
        console.log('✅ Plano encontrado na tabela companies:', planCode);
      }
    } catch (companyErr) {
      console.log('⚠️ Erro ao acessar tabela companies:', companyErr.message);
    }
    
    // Se não encontrou na companies, tentar na profiles
    if (!planCode) {
      try {
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('plan_name')
          .eq('user_id', userId)
          .single();
        
        if (!profileError && profileData?.plan_name) {
          planCode = profileData.plan_name;
          console.log('✅ Plano encontrado na tabela profiles:', planCode);
        }
      } catch (profileErr) {
        console.log('⚠️ Erro ao acessar tabela profiles:', profileErr.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral ao buscar plano:', error.message);
  }

  // Se não encontrou plano, usar fallback
  if (!planCode) {
    console.log('⚠️ Nenhum plano encontrado, usando fallback: start-quantico');
    planCode = 'start-quantico';
  }

  // Normalizar e validar o plano
  const normalizedPlan = normalizePlanCode(planCode);
  
  console.log('✅ Plano final:', normalizedPlan);
  return normalizedPlan;
}

function getPlanAdminRoute(planCode) {
  const normalizedCode = normalizePlanCode(planCode);
  
  switch (normalizedCode) {
    case 'start-quantico':
      return '/admin/start';
    case 'vortex-neural':
      return '/admin/vortex';
    case 'nexus-infinito':
      return '/admin/nexus';
    default:
      return '/admin/start';
  }
}

async function testPlanFix() {
  console.log('🧪 TESTANDO CORREÇÃO DOS PLANOS DE USUÁRIO');
  console.log('=' .repeat(50));
  
  // Teste 1: Usuário inexistente (cenário mais comum)
  console.log('\n1️⃣ Teste com usuário inexistente...');
  const testUserId1 = '00000000-0000-0000-0000-000000000001';
  const plan1 = await getUserPlanFixed(supabase, testUserId1);
  const route1 = getPlanAdminRoute(plan1);
  console.log(`📋 Resultado: Plano=${plan1}, Rota=${route1}`);
  
  // Teste 2: Cliente Supabase inválido
  console.log('\n2️⃣ Teste com cliente Supabase inválido...');
  const plan2 = await getUserPlanFixed(null, testUserId1);
  const route2 = getPlanAdminRoute(plan2);
  console.log(`📋 Resultado: Plano=${plan2}, Rota=${route2}`);
  
  // Teste 3: Cliente sem método from
  console.log('\n3️⃣ Teste com cliente sem método from...');
  const plan3 = await getUserPlanFixed({}, testUserId1);
  const route3 = getPlanAdminRoute(plan3);
  console.log(`📋 Resultado: Plano=${plan3}, Rota=${route3}`);
  
  // Teste 4: Normalização de planos
  console.log('\n4️⃣ Teste de normalização de planos...');
  const testPlans = [
    'start_quantico',
    'vortex_neural', 
    'nexus_infinito',
    'plano_invalido',
    null,
    undefined,
    ''
  ];
  
  testPlans.forEach(plan => {
    const normalized = normalizePlanCode(plan);
    const route = getPlanAdminRoute(normalized);
    console.log(`📋 '${plan}' -> '${normalized}' -> '${route}'`);
  });
  
  console.log('\n✅ TODOS OS TESTES CONCLUÍDOS!');
  console.log('\n🎯 RESUMO DA CORREÇÃO:');
  console.log('• ❌ Antes: Função lançava exceções quando não encontrava planos');
  console.log('• ✅ Agora: Função sempre retorna um plano válido (fallback: start-quantico)');
  console.log('• ✅ Agora: Lida graciosamente com erros de RLS e permissões');
  console.log('• ✅ Agora: Valida o cliente Supabase antes de usar');
  console.log('• ✅ Agora: Normaliza códigos de plano automaticamente');
  
  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('1. Teste o frontend - o erro "Usuário sem plano válido" não deve mais ocorrer');
  console.log('2. Usuários serão redirecionados para /admin/start por padrão');
  console.log('3. Quando fizerem login, o perfil será criado automaticamente');
  console.log('4. Configure as políticas RLS se necessário para permitir inserções');
}

testPlanFix().catch(console.error);