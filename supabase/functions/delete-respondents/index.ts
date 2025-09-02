import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface DeleteRequest {
  action: 'delete_single' | 'delete_multiple';
  respondentIds: string[];
  confirmationText?: string;
}

interface DeleteResponse {
  success: boolean;
  message: string;
  deletedCount?: number;
  auditLogId?: string;
  error?: string;
}

// Helper function for logging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-RESPONDENTS] ${step}${detailsStr}`);
};

// Function to create audit log entry
const createAuditLog = async (supabase: any, userId: string, action: string, details: any) => {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action,
        details,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logStep('Audit log creation failed', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    logStep('Audit log creation error', error);
    return null;
  }
};

// Function to delete respondent and related data
const deleteRespondentCascade = async (supabase: any, respondentId: string, userId: string) => {
  try {
    logStep('Starting cascade deletion', { respondentId, userId });
    
    // First, get respondent info for audit
    const { data: respondent, error: fetchError } = await supabase
      .from('respondents')
      .select('name, email')
      .eq('id', respondentId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !respondent) {
      logStep('Respondent not found or access denied', { respondentId, userId });
      return { success: false, error: 'Respondente não encontrado ou acesso negado' };
    }
    
    // Delete related data in correct order (respecting foreign key constraints)
    
    // 1. Delete question_responses first
    const { error: questionResponsesError } = await supabase
      .from('question_responses')
      .delete()
      .in('response_id', 
        supabase
          .from('responses')
          .select('id')
          .eq('respondent_id', respondentId)
      );
    
    if (questionResponsesError) {
      logStep('Error deleting question_responses', questionResponsesError);
    }
    
    // 2. Delete responses
    const { error: responsesError } = await supabase
      .from('responses')
      .delete()
      .eq('respondent_id', respondentId);
    
    if (responsesError) {
      logStep('Error deleting responses', responsesError);
    }
    
    // 3. Delete sentiment_analysis related to this respondent
    const { error: sentimentError } = await supabase
      .from('sentiment_analysis')
      .delete()
      .eq('respondent_id', respondentId);
    
    if (sentimentError) {
      logStep('Error deleting sentiment_analysis', sentimentError);
    }
    
    // 4. Delete magic_links for this respondent
    const { error: magicLinksError } = await supabase
      .from('magic_links')
      .delete()
      .eq('email', respondent.email);
    
    if (magicLinksError) {
      logStep('Error deleting magic_links', magicLinksError);
    }
    
    // 5. Delete responses by respondent_id (if any exist)
    const { error: responsesByRespondentError } = await supabase
      .from('responses')
      .delete()
      .eq('respondent_id', respondentId);
    
    if (responsesByRespondentError) {
      logStep('Error deleting responses by respondent_id', responsesByRespondentError);
    }
    
    // 6. Finally, delete the respondent
    const { error: respondentError } = await supabase
      .from('respondents')
      .delete()
      .eq('id', respondentId)
      .eq('user_id', userId);
    
    if (respondentError) {
      logStep('Error deleting respondent', respondentError);
      return { success: false, error: 'Erro ao excluir respondente' };
    }
    
    logStep('Cascade deletion completed successfully', { respondentId });
    return { success: true, respondent };
    
  } catch (error) {
    logStep('Cascade deletion error', error);
    return { success: false, error: 'Erro interno durante exclusão' };
  }
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método não permitido' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
  
  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autorização necessário' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      logStep('Authentication failed', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Parse request body
    const requestData: DeleteRequest = await req.json();
    logStep('Delete request received', { action: requestData.action, count: requestData.respondentIds?.length });
    
    // Validate request
    if (!requestData.action || !requestData.respondentIds || requestData.respondentIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados de requisição inválidos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // For multiple deletions, require confirmation text
    if (requestData.action === 'delete_multiple' && requestData.confirmationText !== 'CONFIRMAR EXCLUSÃO') {
      return new Response(
        JSON.stringify({ success: false, error: 'Texto de confirmação inválido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Rate limiting check (max 10 deletions per minute per user)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentDeletions } = await supabase
      .from('audit_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('action', 'delete_respondents')
      .gte('timestamp', oneMinuteAgo);
    
    if (recentDeletions && recentDeletions.length >= 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Limite de exclusões por minuto excedido' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Process deletions
    const deletedRespondents = [];
    const errors = [];
    
    for (const respondentId of requestData.respondentIds) {
      const result = await deleteRespondentCascade(supabase, respondentId, user.id);
      
      if (result.success) {
        deletedRespondents.push(result.respondent);
      } else {
        errors.push({ respondentId, error: result.error });
      }
    }
    
    // Create audit log
    const auditLogId = await createAuditLog(supabase, user.id, 'delete_respondents', {
      action: requestData.action,
      deletedCount: deletedRespondents.length,
      deletedRespondents: deletedRespondents.map(r => ({ name: r.name, email: r.email })),
      errors: errors.length > 0 ? errors : undefined
    });
    
    const response: DeleteResponse = {
      success: deletedRespondents.length > 0,
      message: deletedRespondents.length > 0 
        ? `${deletedRespondents.length} respondente(s) excluído(s) com sucesso`
        : 'Nenhum respondente foi excluído',
      deletedCount: deletedRespondents.length,
      auditLogId: auditLogId || undefined
    };
    
    if (errors.length > 0) {
      response.error = `${errors.length} erro(s) durante exclusão`;
    }
    
    logStep('Delete operation completed', response);
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    logStep('Unexpected error', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});