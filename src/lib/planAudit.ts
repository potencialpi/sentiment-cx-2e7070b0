import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

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
    const { data: companyData } = await supabase
      .from('companies')
      .select('plan_name')
      .eq('user_id', userId)
      .single();

    if (companyData?.plan_name) {
      return companyData.plan_name;
    }

    // Se não encontrar na companies, buscar na profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('plan_name')
      .eq('user_id', userId)
      .single();

    return profileData?.plan_name || null;
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
  // Validar plano
  if (!validatePlan(newPlan)) {
    throw new Error(`Plano inválido: ${newPlan}`);
  }

  // Buscar plano atual
  const currentPlan = await getCurrentUserPlan(supabase, userId);

  // Registrar auditoria ANTES da mudança
  await logPlanChange(supabase, {
    user_id: userId,
    old_plan: currentPlan || undefined,
    new_plan: newPlan,
    source,
    session_id: sessionId,
    metadata: {
      ...metadata,
      action: 'plan_assignment',
      previous_plan: currentPlan
    }
  });

  // Atualizar plano nas tabelas
  const updateData = {
    plan_name: newPlan,
    plan_type: newPlan,
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
    .update({ plan_name: newPlan, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (companyError) {
    console.error('Erro ao atualizar plano na tabela companies:', companyError);
  }

  console.log('✅ PLANO ATRIBUÍDO COM SUCESSO E AUDITORIA COMPLETA', {
    userId,
    oldPlan: currentPlan,
    newPlan,
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
    const [companyData, profileData] = await Promise.all([
      supabase.from('companies').select('plan_name').eq('user_id', userId).single(),
      supabase.from('profiles').select('plan_name, plan_type').eq('user_id', userId).single()
    ]);

    const companyPlan = companyData.data?.plan_name;
    const profilePlan = profileData.data?.plan_name;
    const profilePlanType = profileData.data?.plan_type;

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