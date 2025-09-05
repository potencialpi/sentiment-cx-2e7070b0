const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Versão robusta da função getUserPlan que lida com erros graciosamente
async function getUserPlanRobust(supabaseClient, userId) {
  console.log('🔍 Buscando plano do usuário:', userId);
  
  // Validação do cliente Supabase
  if (!supabaseClient || typeof supabaseClient.from !== 'function') {
    console.error('❌ Cliente Supabase inválido');
    return 'start-quantico'; // Fallback seguro
  }
  
  let planCode = null;

  try {
    // Tentar buscar o plano na tabela companies primeiro
    console.log('🏢 Tentando buscar na tabela companies...');
    
    try {
      const { data: companyData, error: companyError } = await supabaseClient
        .from('companies')
        .select('plan_name')
        .eq('user_id', userId)
        .single();

      if (companyError) {
        console.log('⚠️ Erro na tabela companies:', companyError.message);
      } else if (companyData?.plan_name) {
        planCode = companyData.plan_name;
        console.log('✅ Plano encontrado na tabela companies:', planCode);
      }
    } catch (companyErr) {
      console.log('⚠️ Erro ao acessar tabela companies:', companyErr.message);
    }
    
    // Se não encontrou na companies, tentar na profiles
    if (!planCode) {
      console.log('👤 Tentando buscar na tabela profiles...');
      
      try {
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('plan_name')
          .eq('user_id', userId)
          .single();
        
        if (profileError) {
          console.log('⚠️ Erro na tabela profiles:', profileError.message);
        } else if (profileData?.plan_name) {
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

  // Validar se o plano é válido
  const validPlans = ['start-quantico', 'vortex-neural', 'nexus-infinito'];
  if (!validPlans.includes(planCode)) {
    console.log(`⚠️ Plano inválido '${planCode}', usando fallback: start-quantico`);
    planCode = 'start-quantico';
  }

  console.log('✅ Plano final:', planCode);
  return planCode;
}

// Função para normalizar códigos de plano
function normalizePlanCode(planCode) {
  if (!planCode) return 'start-quantico';
  
  // Converter underscores para hífens
  const normalized = planCode.replace(/_/g, '-');
  
  const validPlans = ['start-quantico', 'vortex-neural', 'nexus-infinito'];
  if (validPlans.includes(normalized)) {
    return normalized;
  }
  
  return 'start-quantico';
}

// Função para obter rota administrativa
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

async function testRobustPlanFunction() {
  console.log('🧪 Testando função robusta de planos...');
  
  // Teste com usuário fictício
  const testUserId = '00000000-0000-0000-0000-000000000001';
  
  console.log('\n1️⃣ Teste com cliente válido...');
  const plan1 = await getUserPlanRobust(supabase, testUserId);
  console.log('Resultado:', plan1);
  console.log('Rota admin:', getPlanAdminRoute(plan1));
  
  console.log('\n2️⃣ Teste com cliente null...');
  const plan2 = await getUserPlanRobust(null, testUserId);
  console.log('Resultado:', plan2);
  console.log('Rota admin:', getPlanAdminRoute(plan2));
  
  console.log('\n3️⃣ Teste com cliente inválido...');
  const plan3 = await getUserPlanRobust({}, testUserId);
  console.log('Resultado:', plan3);
  console.log('Rota admin:', getPlanAdminRoute(plan3));
  
  console.log('\n4️⃣ Teste de normalização de planos...');
  console.log('start_quantico ->', normalizePlanCode('start_quantico'));
  console.log('vortex_neural ->', normalizePlanCode('vortex_neural'));
  console.log('plano_invalido ->', normalizePlanCode('plano_invalido'));
  console.log('null ->', normalizePlanCode(null));
  
  console.log('\n✅ Todos os testes concluídos!');
}

// Gerar código TypeScript corrigido
function generateFixedPlanUtils() {
  const fixedCode = `
// VERSÃO CORRIGIDA DO planUtils.ts
// Esta versão lida graciosamente com erros e sempre retorna um plano válido

export const planDisplayNames = {
  'start-quantico': 'Start Quântico',
  'vortex-neural': 'Vortex Neural', 
  'nexus-infinito': 'Nexus Infinito'
} as const;

export type PlanCode = keyof typeof planDisplayNames;

// Função para normalizar códigos de plano (converte underscore para hífen)
export function normalizePlanCode(planCode: string): string {
  if (!planCode) return 'start-quantico';
  
  // Converter underscores para hífens para manter consistência
  const normalized = planCode.replace(/_/g, '-');
  
  // Verificar se é um código válido
  if (normalized in planDisplayNames) {
    return normalized;
  }
  
  // Fallback para start-quantico
  return 'start-quantico';
}

export function getPlanDisplayName(planCode: string): string {
  const normalizedCode = normalizePlanCode(planCode);
  return planDisplayNames[normalizedCode as PlanCode] || planCode;
}

export function getPlanAdminRoute(planCode: string): string {
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

// VERSÃO ROBUSTA - Nunca falha, sempre retorna um plano válido
export async function getUserPlan(supabase: any, userId: string): Promise<string> {
  console.log('🔍 Buscando plano do usuário:', userId);
  
  // Validação do cliente Supabase
  if (!supabase || typeof supabase.from !== 'function') {
    console.error('❌ Cliente Supabase inválido, usando fallback');
    return 'start-quantico';
  }
  
  let planCode: string | null = null;

  try {
    // Tentar buscar o plano na tabela companies primeiro
    try {
      const { data: companyData, error: companyError } = await supabase
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
        const { data: profileData, error: profileError } = await supabase
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
`;
  
  console.log('\n📝 CÓDIGO CORRIGIDO PARA planUtils.ts:');
  console.log('=' .repeat(50));
  console.log(fixedCode);
  console.log('=' .repeat(50));
}

async function main() {
  await testRobustPlanFunction();
  generateFixedPlanUtils();
}

main().catch(console.error);