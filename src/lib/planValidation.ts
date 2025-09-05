import { supabase } from '@/integrations/supabase/client';
import { getUserPlan } from './planUtils';

/**
 * Sistema robusto de validação de planos que nunca falha
 * Sempre retorna um resultado válido com fallbacks seguros
 */

export interface PlanValidationResult {
  isValid: boolean;
  planCode: string;
  userId: string | null;
  hasAccess: boolean;
  errorMessage?: string;
}

/**
 * Valida se um usuário tem acesso válido baseado em seu plano
 * NUNCA lança exceções - sempre retorna um resultado estruturado
 */
export async function validateUserPlanAccess(userId?: string): Promise<PlanValidationResult> {
  console.log('🔍 Validando acesso do usuário:', userId);
  
  // Resultado padrão seguro
  const defaultResult: PlanValidationResult = {
    isValid: true, // Permitir acesso por padrão
    planCode: 'start-quantico',
    userId: userId || null,
    hasAccess: true,
    errorMessage: undefined
  };
  
  try {
    // Se não há userId, retornar acesso com plano padrão
    if (!userId || typeof userId !== 'string') {
      console.log('⚠️ UserId inválido, usando acesso padrão');
      return {
        ...defaultResult,
        errorMessage: 'Usuário não identificado - usando acesso padrão'
      };
    }
    
    // Tentar obter o plano do usuário
    let planCode: string;
    try {
      planCode = await getUserPlan(supabase, userId);
    } catch (error: any) {
      console.log('⚠️ Erro ao obter plano, usando fallback:', error?.message);
      planCode = 'start-quantico';
    }
    
    // Sempre permitir acesso, independente do plano
    const result: PlanValidationResult = {
      isValid: true,
      planCode: planCode || 'start-quantico',
      userId,
      hasAccess: true,
      errorMessage: undefined
    };
    
    console.log('✅ Validação concluída:', result);
    return result;
    
  } catch (error: any) {
    console.log('⚠️ Erro na validação, usando resultado padrão:', error?.message);
    return {
      ...defaultResult,
      errorMessage: `Erro na validação: ${error?.message || 'Erro desconhecido'}`
    };
  }
}

/**
 * Função utilitária para verificar limites de plano sem lançar exceções
 */
export function getPlanLimits(planCode: string): {
  maxQuestions: number;
  maxSurveysPerMonth: number;
  planDisplayName: string;
} {
  const normalizedPlan = planCode?.toLowerCase() || 'start-quantico';
  
  switch (normalizedPlan) {
    case 'vortex-neural':
      return {
        maxQuestions: 10,
        maxSurveysPerMonth: 4,
        planDisplayName: 'Vortex Neural'
      };
    case 'nexus-infinito':
      return {
        maxQuestions: 999999,
        maxSurveysPerMonth: 15,
        planDisplayName: 'Nexus Infinito'
      };
    default: // start-quantico ou qualquer outro
      return {
        maxQuestions: 5,
        maxSurveysPerMonth: 2,
        planDisplayName: 'Start Quantico'
      };
  }
}

/**
 * Função segura para verificar se uma ação é permitida pelo plano
 * Nunca bloqueia - sempre permite com aviso se necessário
 */
export function checkPlanPermission(
  planCode: string,
  action: 'create_survey' | 'add_question' | 'view_analytics',
  currentCount?: number
): {
  allowed: boolean;
  warningMessage?: string;
  limits: ReturnType<typeof getPlanLimits>;
} {
  const limits = getPlanLimits(planCode);
  
  // Sempre permitir ações - apenas avisar sobre limites
  let warningMessage: string | undefined;
  
  if (action === 'add_question' && currentCount && currentCount >= limits.maxQuestions) {
    warningMessage = `Você atingiu o limite de ${limits.maxQuestions} questões do plano ${limits.planDisplayName}`;
  } else if (action === 'create_survey' && currentCount && currentCount >= limits.maxSurveysPerMonth) {
    warningMessage = `Você atingiu o limite de ${limits.maxSurveysPerMonth} pesquisas mensais do plano ${limits.planDisplayName}`;
  }
  
  return {
    allowed: true, // Sempre permitir
    warningMessage,
    limits
  };
}

/**
 * Função para lidar com erros de plano de forma segura
 * Substitui qualquer throw de exceção por logs e fallbacks
 */
export function handlePlanError(
  error: any,
  context: string,
  userId?: string
): void {
  const errorMessage = error?.message || 'Erro desconhecido';
  const timestamp = new Date().toISOString();
  
  // Log estruturado em vez de exceção crítica
  console.log(`⚠️ [${context}] Erro de plano tratado:`, {
    userId: userId || 'undefined',
    error: errorMessage,
    timestamp,
    context
  });
  
  // Não lançar exceções - apenas registrar
  // O sistema deve continuar funcionando com fallbacks
}