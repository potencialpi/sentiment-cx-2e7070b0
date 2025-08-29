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
  
  console.log(`[getPlanAdminRoute] Input: ${planCode} -> Normalized: ${normalizedCode}`);
  
  switch (normalizedCode) {
    case 'start-quantico':
      console.log(`[getPlanAdminRoute] Redirecting to: /admin/start`);
      return '/admin/start';
    case 'vortex-neural':
      console.log(`[getPlanAdminRoute] Redirecting to: /admin/vortex`);
      return '/admin/vortex';
    case 'nexus-infinito':
      console.log(`[getPlanAdminRoute] Redirecting to: /admin/nexus`);
      return '/admin/nexus';
    default:
      console.log(`[getPlanAdminRoute] Unknown plan, redirecting to: /dashboard`);
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
    console.log(`[getUserPlan] INICIANDO busca para USER: ${userId}`);
    
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
    const companyError = companyResult.error;
    const profileError = profileResult.error;

    console.log(`[getUserPlan] Company result:`, { plan: companyPlan, error: companyError?.message });
    console.log(`[getUserPlan] Profile result:`, { plan: profilePlan, error: profileError?.message });

    // Se houve erro de autenticação (401), logar e usar fallback
    if (companyError?.code === '401' || profileError?.code === '401') {
      console.warn(`[getUserPlan] RLS/Auth error detected - using authenticated user data fallback`);
      // Para casos onde a sessão não tem permissões RLS, tentar usar user metadata se disponível
      return 'start-quantico'; // Para agora sempre usar fallback em caso de erro RLS
    }

    // NOVA LÓGICA DE PRIORIZAÇÃO: Hierarquia de planos (maior valor primeiro)
    // Prioridade: nexus-infinito > vortex-neural > start-quantico
    const planHierarchy = {
      'nexus-infinito': 3,
      'vortex-neural': 2, 
      'start-quantico': 1
    };

    const plans = [companyPlan, profilePlan].filter(Boolean);
    
    if (plans.length > 0) {
      // Escolher o plano de maior hierarquia entre company e profile
      planCode = plans.reduce((highest, current) => {
        const currentValue = planHierarchy[current as keyof typeof planHierarchy] || 0;
        const highestValue = planHierarchy[highest as keyof typeof planHierarchy] || 0;
        return currentValue > highestValue ? current : highest;
      });
      
      console.log(`[getUserPlan] Plano de maior hierarquia encontrado: ${planCode}`);
      console.log(`[getUserPlan] Fonte: ${companyPlan === planCode ? 'company' : 'profile'}`);
    } else {
      console.log(`[getUserPlan] Nenhum plano encontrado nas tabelas, usando fallback: ${planCode}`);
    }

  } catch (error) {
    console.error('[getUserPlan] Erro ao buscar plano do usuário:', error);
    console.log(`[getUserPlan] Exception caught, usando fallback: ${planCode}`);
  }

  console.log(`[getUserPlan] RESULTADO FINAL: ${planCode}`);
  return planCode;
}