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

export function getPlanRespondentsRoute(planCode: string): string {
  const normalizedCode = normalizePlanCode(planCode);
  
  switch (normalizedCode) {
    case 'start-quantico':
      return '/admin/start-quantico/respondents';
    case 'vortex-neural':
      return '/admin/vortex-neural/respondents';
    case 'nexus-infinito':
      return '/admin/nexus-infinito/respondents';
    default:
      return '/admin/start-quantico/respondents';
  }
}

// Função utilitária para buscar o plano do usuário de forma consistente
// VERSÃO ROBUSTA - Nunca falha, sempre retorna um plano válido
export async function getUserPlan(supabase: any, userId: string): Promise<string> {
  console.log('🔍 Buscando plano do usuário:', userId);
  
  // Validação rigorosa do cliente Supabase
  if (!supabase) {
    console.error('❌ Cliente Supabase é null/undefined, usando fallback');
    return 'start-quantico';
  }
  
  if (typeof supabase.from !== 'function') {
    console.error('❌ Cliente Supabase não possui método from, usando fallback. Tipo:', typeof supabase);
    console.error('❌ Propriedades do objeto:', Object.keys(supabase || {}));
    return 'start-quantico';
  }
  
  // Validação do userId
  if (!userId || typeof userId !== 'string') {
    console.error('❌ UserId inválido:', userId, 'usando fallback');
    return 'start-quantico';
  }
  
  let planCode: string | null = null;

  try {
    // Tentar buscar o plano na tabela companies primeiro
    try {
      console.log('🔍 Tentando buscar na tabela companies...');
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('plan_name')
        .eq('user_id', userId)
        .single();

      if (companyError) {
        console.log('⚠️ Erro na tabela companies:', companyError.message);
      } else if (companyData?.plan_name) {
        planCode = companyData.plan_name;
        console.log('✅ Plano encontrado na tabela companies:', planCode);
      } else {
        console.log('⚠️ Nenhum dado encontrado na tabela companies');
      }
    } catch (companyErr: any) {
      console.log('⚠️ Exceção ao acessar tabela companies:', companyErr?.message || companyErr);
    }
    
    // Se não encontrou na companies, tentar na profiles
    if (!planCode) {
      try {
        console.log('🔍 Tentando buscar na tabela profiles...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('plan_name')
          .eq('user_id', userId)
          .single();
        
        if (profileError) {
          console.log('⚠️ Erro na tabela profiles:', profileError.message);
        } else if (profileData?.plan_name) {
          planCode = profileData.plan_name;
          console.log('✅ Plano encontrado na tabela profiles:', planCode);
        } else {
          console.log('⚠️ Nenhum dado encontrado na tabela profiles');
        }
      } catch (profileErr: any) {
        console.log('⚠️ Exceção ao acessar tabela profiles:', profileErr?.message || profileErr);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Erro geral ao buscar plano:', error?.message || error);
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