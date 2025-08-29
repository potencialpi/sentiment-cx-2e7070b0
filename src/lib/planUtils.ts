export const planDisplayNames = {
  'start-quantico': 'Start Quântico',
  'vortex-neural': 'Vortex Neural',
  'vortex-pro': 'Vortex Neural', // Alias para vortex-neural
  'nexus-infinito': 'Nexus Infinito',
  'basico': 'Start Quântico' // Alias para start-quantico
} as const;

export type PlanCode = keyof typeof planDisplayNames;

// Função para normalizar códigos de plano (converte underscore para hífen e mapeia aliases)
export function normalizePlanCode(planCode: string): string {
  if (!planCode) return 'start-quantico';
  
  // Converter underscores para hífens para manter consistência
  const normalized = planCode.replace(/_/g, '-');
  
  // Mapear aliases para planos principais
  const planMapping: Record<string, string> = {
    'vortex-pro': 'vortex-neural',
    'basico': 'start-quantico'
  };
  
  // Se é um alias, retornar o plano principal
  if (planMapping[normalized]) {
    return planMapping[normalized];
  }
  
  // Verificar se é um código válido dos planos principais
  const mainPlans = ['start-quantico', 'vortex-neural', 'nexus-infinito'];
  if (mainPlans.includes(normalized)) {
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
      // Se não conseguir identificar o plano, redirecionar para dashboard
      // que fará a verificação correta do plano do usuário
      return '/dashboard';
  }
}

export function getPlanCreateSurveyRoute(planCode: string): string {
  const normalizedCode = normalizePlanCode(planCode);
  
  switch (normalizedCode) {
    case 'start-quantico':
      return '/admin/start';
    case 'vortex-neural':
      return '/create-survey-vortex';
    case 'nexus-infinito':
      return '/create-survey-nexus';
    default:
      return '/admin/start';
  }
}

// Função utilitária para buscar o plano do usuário de forma consistente
export async function getUserPlan(supabase: any, userId: string): Promise<string> {
  let planCode = 'start-quantico'; // fallback padrão

  try {
    // Buscar planos em ambas as tabelas
    const [companyResult, profileResult] = await Promise.all([
      supabase
        .from('companies')
        .select('plan_name')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('profiles')
        .select('plan_name')
        .eq('user_id', userId)
        .single()
    ]);

    const companyPlan = companyResult.data?.plan_name;
    const profilePlan = profileResult.data?.plan_name;

    console.log('getUserPlan - Company plan:', companyPlan);
    console.log('getUserPlan - Profile plan:', profilePlan);

    // Lógica de priorização:
    // 1. Se o profile tem um plano diferente de 'start-quantico', usar ele (plano escolhido pelo usuário)
    // 2. Caso contrário, usar o plano da company
    // 3. Fallback para 'start-quantico'
    if (profilePlan && profilePlan !== 'start-quantico') {
      planCode = profilePlan;
      console.log('getUserPlan - Usando plano do profile (escolhido pelo usuário):', planCode);
    } else if (companyPlan) {
      planCode = companyPlan;
      console.log('getUserPlan - Usando plano da company:', planCode);
    } else if (profilePlan) {
      planCode = profilePlan;
      console.log('getUserPlan - Usando plano do profile (fallback):', planCode);
    }

  } catch (error) {
    console.error('Erro ao buscar plano do usuário:', error);
  }

  console.log('getUserPlan - Plano final determinado:', planCode);
  return planCode;
}