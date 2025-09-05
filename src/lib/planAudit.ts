import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { safeRead, rlsFallbacks, logRLSError } from './rlsErrorHandler';

export interface PlanAuditLog {
  user_id: string;
  old_plan?: string;
  new_plan: string;
  source: 'webhook' | 'manual' | 'signup' | 'admin';
  session_id?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Registra uma mudança de plano no sistema de auditoria
 */
export async function logPlanChange(
  supabase: SupabaseClient<Database>,
  auditData: Omit<PlanAuditLog, 'timestamp'>
): Promise<void> {
  try {
    const auditLog: PlanAuditLog = {
      ...auditData,
      timestamp: new Date().toISOString()
    };

    console.log('📋 AUDITORIA DE PLANO', auditLog);

    // Salvar no banco de dados (assumindo que existe uma tabela plan_audit_logs)
    const { error } = await supabase
      .from('audit_log')
      .insert({
        user_id: auditLog.user_id,
        event_type: 'plan_change',
        table_name: 'profiles',
        details: {
          old_plan: auditLog.old_plan,
          new_plan: auditLog.new_plan,
          source: auditLog.source,
          session_id: auditLog.session_id,
          metadata: auditLog.metadata
        }
      });

    if (error) {
      console.error('❌ ERRO AO SALVAR AUDITORIA DE PLANO:', error);
      // Não falhar o processo principal por erro de auditoria
    } else {
      console.log('✅ AUDITORIA DE PLANO SALVA COM SUCESSO');
    }
  } catch (error) {
    console.error('❌ ERRO INESPERADO NA AUDITORIA DE PLANO:', error);
    // Não falhar o processo principal por erro de auditoria
  }
}

/**
 * Valida se um plano é válido antes de atribuí-lo
 */
export function validatePlan(planCode: string): boolean {
  const validPlans = ['start-quantico', 'vortex-neural', 'nexus-infinito'];
  return validPlans.includes(planCode);
}

/**
 * Busca o plano atual do usuário para comparação
 */
export async function getCurrentUserPlan(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  try {
    // Buscar primeiro na tabela companies
    const companyResult = await safeRead(
      () => supabase.from('companies').select('plan_name').eq('user_id', userId).single(),
      rlsFallbacks.getCompany(),
      'fetch company plan'
    );

    if (companyResult.data?.plan_name) {
      return companyResult.data.plan_name;
    }

    // Se não encontrar na companies, buscar na profiles
    const profileResult = await safeRead(
      () => supabase.from('profiles').select('plan_name').eq('user_id', userId).single(),
      rlsFallbacks.getUserProfile(),
      'fetch profile plan'
    );

    return profileResult.data?.plan_name || null;
  } catch (error) {
    console.error('Erro ao buscar plano atual do usuário:', error);
    return null;
  }
}

/**
 * Função principal para atribuir plano com auditoria completa
 */
export async function assignPlanWithAudit(
  supabase: SupabaseClient<Database>,
  userId: string,
  newPlan: string,
  source: PlanAuditLog['source'],
  sessionId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Validar/normalizar plano com fallback
  const normalized = (newPlan || '').toLowerCase();
  const validPlans = ['start-quantico', 'vortex-neural', 'nexus-infinito'];
  const effectivePlan = validPlans.includes(normalized) ? normalized : 'start-quantico';
  if (!validPlans.includes(normalized)) {
    console.warn(`Plano inválido recebido: ${newPlan}. Aplicando fallback para ${effectivePlan}.`);
  }

  // Buscar plano atual
  const currentPlan = await getCurrentUserPlan(supabase, userId);

  // Registrar auditoria ANTES da mudança
  await logPlanChange(supabase, {
    user_id: userId,
    old_plan: currentPlan || undefined,
    new_plan: effectivePlan,
    source,
    session_id: sessionId,
    metadata: {
      ...metadata,
      action: 'plan_assignment',
      previous_plan: currentPlan,
      received_plan: newPlan,
      normalized_plan: normalized
    }
  });

  // Atualizar plano nas tabelas
  const updateData = {
    plan_name: effectivePlan,
    plan_type: effectivePlan,
    updated_at: new Date().toISOString()
  };

  // Atualizar na tabela profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('user_id', userId);

  if (profileError) {
    console.error('Erro ao atualizar plano na tabela profiles:', profileError);
  }

  // Atualizar na tabela companies
  const { error: companyError } = await supabase
    .from('companies')
    .update({ plan_name: effectivePlan, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (companyError) {
    console.error('Erro ao atualizar plano na tabela companies:', companyError);
  }

  console.log('✅ PLANO ATRIBUÍDO COM SUCESSO E AUDITORIA COMPLETA', {
    userId,
    oldPlan: currentPlan,
    newPlan: effectivePlan,
    source,
    sessionId
  });
}

/**
 * Verifica inconsistências entre as tabelas de planos
 */
export async function checkPlanConsistency(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ consistent: boolean; details: any }> {
  try {
    const [companyResult, profileResult] = await Promise.all([
      safeRead(
        () => supabase.from('companies').select('plan_name').eq('user_id', userId).single(),
        rlsFallbacks.getCompany(),
        'fetch company plan'
      ),
      safeRead(
        () => supabase.from('profiles').select('plan_name, plan_type').eq('user_id', userId).single(),
        rlsFallbacks.getUserProfile(),
        'fetch profile plan'
      )
    ]);

    if (companyResult.error) logRLSError(companyResult.error, 'company plan fetch');
    if (profileResult.error) logRLSError(profileResult.error, 'profile plan fetch');

    const companyPlan = companyResult.data?.plan_name;
    const profilePlan = profileResult.data?.plan_name;
    const profilePlanType = profileResult.data?.plan_type;

    const consistent = companyPlan === profilePlan && profilePlan === profilePlanType;

    const details = {
      userId,
      companyPlan,
      profilePlan,
      profilePlanType,
      consistent,
      timestamp: new Date().toISOString()
    };

    if (!consistent) {
      console.warn('⚠️ INCONSISTÊNCIA DE PLANOS DETECTADA:', details);
      
      // Registrar inconsistência na auditoria
      await logPlanChange(supabase, {
        user_id: userId,
        old_plan: 'INCONSISTENT',
        new_plan: 'INCONSISTENT',
        source: 'admin',
        metadata: {
          action: 'consistency_check',
          inconsistency_details: details
        }
      });
    }

    return { consistent, details };
  } catch (error) {
    console.error('Erro ao verificar consistência de planos:', error);
    return {
      consistent: false,
      details: { error: error.message, userId }
    };
  }
}