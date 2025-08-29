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
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('plan_name')
        .eq('user_id', userId)
        .maybeSingle()
    ]);

    const companyPlan = companyResult.data?.plan_name;
    const profilePlan = profileResult.data?.plan_name;
    const companyError = companyResult.error;
    const profileError = profileResult.error;

    console.log(`[getUserPlan] Company result:`, { plan: companyPlan, error: companyError?.message });
    console.log(`[getUserPlan] Profile result:`, { plan: profilePlan, error: profileError?.message });

    // Se houve erro de autenticação (401/42501), usar fallback do user_metadata
    if ((companyError?.code === '42501' || profileError?.code === '42501') || 
        (companyError?.message?.includes('permission denied') || profileError?.message?.includes('permission denied'))) {
      console.warn(`[getUserPlan] RLS/Auth error detected - using user_metadata fallback`);
      
      // Tentar obter dados da sessão atual para user_metadata
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userMetadataPlan = session?.user?.user_metadata?.plan_name;
        
        if (userMetadataPlan) {
          console.log(`[getUserPlan] Found plan in user_metadata: ${userMetadataPlan}`);
          return normalizePlanCode(userMetadataPlan);
        }
      } catch (metadataError) {
        console.warn(`[getUserPlan] Failed to get user metadata:`, metadataError);
      }
      
      // Fallback: usar dados armazenados localmente do custom-login
      try {
        const fallbackData = localStorage.getItem('fallback_user_data');
        if (fallbackData) {
          const userData = JSON.parse(fallbackData);
          const isDataFresh = (Date.now() - userData.timestamp) < (24 * 60 * 60 * 1000); // 24 horas
          
          if (isDataFresh && userData.user_id === userId && userData.plan_name) {
            console.log(`[getUserPlan] Using fallback data from localStorage: ${userData.plan_name}`);
            return normalizePlanCode(userData.plan_name);
          }
        }
      } catch (fallbackError) {
        console.warn(`[getUserPlan] Failed to use fallback data:`, fallbackError);
      }
      
      // Se não conseguiu dos metadados, manter fallback
      console.log(`[getUserPlan] Using final fallback: ${planCode}`);
      return planCode;
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