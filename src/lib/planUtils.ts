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
    // Tentar buscar o plano na tabela companies primeiro
    const { data: companyData } = await supabase
      .from('companies')
      .select('plan_name')
      .eq('user_id', userId)
      .single();

    if (companyData?.plan_name) {
      planCode = companyData.plan_name;
    } else {
      // Se não encontrar na companies, tentar na profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan_name')
        .eq('user_id', userId)
        .single();
      
      if (profileData?.plan_name) {
        planCode = profileData.plan_name;
      }
    }
  } catch (error) {
    console.error('Erro ao buscar plano do usuário:', error);
  }

  console.log('getUserPlan - Plano encontrado:', planCode);
  return planCode;
}