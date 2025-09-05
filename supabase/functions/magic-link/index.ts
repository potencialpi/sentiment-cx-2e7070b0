import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface MagicLinkRequest {
  action: 'generate' | 'validate' | 'use'
  email?: string
  surveyId?: string
  token?: string
}

interface MagicLinkResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

// Utilitários de auditoria com foco em privacidade
function maskIp(ip: string | null): string | null {
  if (!ip || ip === 'unknown') return ip
  if (ip.includes(':')) {
    // IPv6: manter apenas prefixo /64
    const parts = ip.split(':')
    return parts.slice(0, 4).join(':') + '::/64'
  }
  // IPv4: mascarar último octeto
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
  }
  return ip
}

function truncateUA(ua: string | null): string | null {
  if (!ua || ua === 'unknown') return ua
  return ua.length > 160 ? ua.substring(0, 160) + '…' : ua
}

async function auditLog(
  supabase: any,
  action: string,
  tableName: string,
  recordId: string | null,
  details: any,
  oldValues?: any,
  newValues?: any
) {
  try {
    const payload = {
      p_action: action,
      p_table_name: tableName,
      p_record_id: recordId,
      p_old_values: oldValues ?? null,
      p_new_values: newValues ?? null,
      p_details: details ?? null,
      p_ip_address: details?.ip ?? null,
      p_user_agent: details?.user_agent ?? null,
      p_user_id: null
    }
    const { error } = await supabase.rpc('log_audit_action', payload)
    if (error) {
      console.log('⚠️  Audit RPC falhou:', error.message)
    }
  } catch (e: any) {
    console.log('⚠️  Audit RPC erro inesperado:', e?.message || e)
  }
}

function buildAuditDetails(clientIP: string, userAgent: string, extra: Record<string, any> = {}) {
  return {
    ip: maskIp(clientIP),
    user_agent: truncateUA(userAgent),
    ...extra,
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Edge Function iniciada')
    console.log('🌐 SUPABASE_URL:', Deno.env.get('SUPABASE_URL'))
    console.log('🔑 SERVICE_ROLE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    console.log('🔑 ANON_KEY exists:', !!Deno.env.get('SUPABASE_ANON_KEY'))
    
    // Cliente com SERVICE_ROLE_KEY para operações de banco de dados
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Cliente com ANON_KEY para autenticação anônima
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const body = await req.json()
    // Log apenas metadados para auditoria (sem dados sensíveis)
    console.log('📦 Request received - Action:', body.action, 'Email provided:', !!body.email, 'Survey ID provided:', !!body.surveyId)
    
    const { action, email, surveyId, token }: MagicLinkRequest = body
    
    // Obter informações da requisição para auditoria LGPD
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    switch (action) {
      case 'generate':
        return await generateMagicLink(supabaseAdmin, email!, surveyId!, clientIP, userAgent)
      
      case 'validate':
        return await validateMagicLink(supabaseAdmin, token!, clientIP, userAgent)
      
      case 'use':
        return await useMagicLink(supabaseAdmin, supabaseAuth, token!, clientIP, userAgent)
      
      default:
        console.log('❌ Ação inválida:', action)
        return new Response(
          JSON.stringify({ success: false, error: 'Ação inválida' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('💥 Erro na função magic-link:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function generateMagicLink(
  supabase: any, 
  email: string, 
  surveyId: string, 
  clientIP: string, 
  userAgent: string
): Promise<Response> {
  try {
    console.log('🔗 Gerando magic link - Email hash:', email.substring(0,3) + '***', 'Survey ID:', surveyId)

    // Auditoria: tentativa de geração
    await auditLog(
      supabase,
      'MAGIC_LINK_GENERATE_ATTEMPT',
      'magic_links',
      null,
      buildAuditDetails(clientIP, userAgent, {
        email_mask: email.substring(0, 3) + '***',
        survey_id: surveyId
      })
    )
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      // Auditoria: email inválido
      await auditLog(
        supabase,
        'MAGIC_LINK_GENERATE_INVALID_EMAIL',
        'magic_links',
        null,
        buildAuditDetails(clientIP, userAgent, { reason: 'invalid_email' })
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se a pesquisa existe (usando SERVICE_ROLE_KEY para acesso seguro)
    console.log('🔍 Buscando pesquisa com ID:', surveyId)
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title, user_id, status')
      .eq('id', surveyId)
      .single()
    
    console.log('📊 Resultado da busca - Survey:', survey, 'Error:', surveyError)

    if (surveyError || !survey) {
      console.log('❌ Pesquisa não encontrada:', surveyError)
      // Auditoria: pesquisa não encontrada
      await auditLog(
        supabase,
        'MAGIC_LINK_GENERATE_SURVEY_NOT_FOUND',
        'magic_links',
        null,
        buildAuditDetails(clientIP, userAgent, { survey_id: surveyId, reason: surveyError?.message || 'not_found' })
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Pesquisa não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Gerar token único e seguro
    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    // Invalidar tokens anteriores para o mesmo email/survey (segurança)
    await supabase
      .from('magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('email', email)
      .eq('survey_id', surveyId)
      .is('used_at', null)

    // Criar novo magic link
    const { data: magicLink, error: insertError } = await supabase
      .from('magic_links')
      .insert({
        email,
        token,
        survey_id: surveyId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Erro ao criar magic link:', insertError)
      // Auditoria: falha
      await auditLog(
        supabase,
        'MAGIC_LINK_GENERATE_FAILED',
        'magic_links',
        null,
        buildAuditDetails(clientIP, userAgent, { survey_id: surveyId, reason: insertError.message })
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar link de acesso' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Magic link criado:', magicLink.id)
    
    // Auditoria: sucesso
    await auditLog(
      supabase,
      'MAGIC_LINK_GENERATE_SUCCESS',
      'magic_links',
      magicLink.id,
      buildAuditDetails(clientIP, userAgent, {
        survey_id: surveyId,
        expires_at: expiresAt.toISOString()
      })
    )

    // Construir URL do magic link
    const baseUrl = Deno.env.get('FRONTEND_URL') || 'https://traesentiment-cx-2e7070b0-mainfsak-potencialpi-potencial-pi.vercel.app'
    const magicLinkUrl = `${baseUrl}/auth/magic-link?token=${token}&surveyId=${surveyId}`

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Link de acesso gerado com sucesso',
        data: {
          magicLinkUrl,
          expiresAt: expiresAt.toISOString(),
          surveyTitle: survey.title
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('💥 Erro ao gerar magic link:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function validateMagicLink(
  supabase: any, 
  token: string, 
  clientIP: string, 
  userAgent: string
): Promise<Response> {
  try {
    console.log('🔍 Validando token de magic link - Token length:', token?.length || 0)
    
    // Auditoria: tentativa de validação
    await auditLog(
      supabase,
      'MAGIC_LINK_VALIDATE_ATTEMPT',
      'magic_links',
      null,
      buildAuditDetails(clientIP, userAgent, { token_prefix: token.substring(0, 8) })
    )
    
    // Buscar magic link válido
    const { data: magicLink, error } = await supabase
      .from('magic_links')
      .select(`
        id, email, survey_id, expires_at, used_at,
        surveys!inner(id, title, user_id, status)
      `)
      .eq('token', token)
      .single()

    if (error || !magicLink) {
      console.log('❌ Token inválido ou expirado:', error)
      // Auditoria: token inválido/expirado
      await auditLog(
        supabase,
        'MAGIC_LINK_VALIDATE_INVALID',
        'magic_links',
        null,
        buildAuditDetails(clientIP, userAgent, { reason: error?.message || 'not_found_or_expired' })
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se o token não expirou
    if (new Date(magicLink.expires_at) < new Date()) {
      console.log('❌ Token expirado')
      return new Response(
        JSON.stringify({ success: false, error: 'Token expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se o token já foi usado
    if (magicLink.used_at) {
      console.log('❌ Token já usado')
      return new Response(
        JSON.stringify({ success: false, error: 'Token já foi utilizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se a pesquisa está ativa
    if (magicLink.surveys.status !== 'active') {
      console.log('❌ Pesquisa inativa')
      return new Response(
        JSON.stringify({ success: false, error: 'Pesquisa não está mais ativa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Token válido')

    // Auditoria: sucesso
    await auditLog(
      supabase,
      'MAGIC_LINK_VALIDATE_SUCCESS',
      'magic_links',
      magicLink.id,
      buildAuditDetails(clientIP, userAgent, { survey_id: magicLink.survey_id })
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token válido',
        data: {
          email: magicLink.email,
          surveyId: magicLink.survey_id,
          surveyTitle: magicLink.surveys.title
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('💥 Erro ao validar magic link:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function useMagicLink(
  supabaseAdmin: any,
  supabaseAuth: any, 
  token: string, 
  clientIP: string, 
  userAgent: string
): Promise<Response> {
  try {
    console.log('🎯 Processando autenticação via magic link - Token length:', token?.length || 0)
    
    // Auditoria: tentativa de uso
    await auditLog(
      supabaseAdmin,
      'MAGIC_LINK_USE_ATTEMPT',
      'magic_links',
      null,
      buildAuditDetails(clientIP, userAgent, { token_prefix: token.substring(0, 8) })
    )
    
    // Primeiro validar o token
    const validationResponse = await validateMagicLink(supabaseAdmin, token, clientIP, userAgent)
    const validationData = await validationResponse.json()
    
    if (!validationData.success) {
      console.log('❌ Token inválido ou expirado no uso')
      // Auditoria: token inválido/expirado ao usar
      await auditLog(
        supabaseAdmin,
        'MAGIC_LINK_USE_INVALID',
        'magic_links',
        null,
        buildAuditDetails(clientIP, userAgent, { reason: 'invalid_or_expired' })
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Marcar token como usado
    const { error: updateError } = await supabaseAdmin
      .from('magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    if (updateError) {
      console.error('❌ Erro ao marcar token como usado:', updateError)
      // Auditoria: falha ao invalidar
      await auditLog(
        supabaseAdmin,
        'MAGIC_LINK_USE_INVALIDATE_FAILED',
        'magic_links',
        null,
        buildAuditDetails(clientIP, userAgent, { token_prefix: token.substring(0, 8), reason: updateError.message })
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Auditoria: link invalidado com sucesso
    await auditLog(
      supabaseAdmin,
      'MAGIC_LINK_USE_INVALIDATED',
      'magic_links',
      null,
      buildAuditDetails(clientIP, userAgent, { token_prefix: token.substring(0, 8) })
    )

    // Criar uma sessão temporária para o usuário anônimo
    // Em vez de usar signInAnonymously, vamos retornar dados de sessão simulados
    // pois o magic link já foi validado e marcado como usado
    const sessionData = {
      access_token: 'magic_link_session_' + token.substring(0, 8),
      token_type: 'bearer',
      expires_in: 3600,
      user: {
        id: 'anonymous_' + validationData.data.email.replace('@', '_at_').replace('.', '_dot_'),
        email: validationData.data.email,
        role: 'anonymous'
      }
    }

    console.log('✅ Sessão criada para usuário anônimo - Email hash:', validationData.data.email.substring(0,3) + '***')

    // Auditoria: sessão criada
    await auditLog(
      supabaseAdmin,
      'MAGIC_LINK_USE_AUTH_SUCCESS',
      'magic_links',
      null,
      buildAuditDetails(clientIP, userAgent, { survey_id: validationData.data.surveyId, email_mask: validationData.data.email.substring(0,3) + '***' })
    )

    console.log('✅ Autenticação bem-sucedida')
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Autenticação realizada com sucesso',
        data: {
          session: sessionData,
          email: validationData.data.email,
          surveyId: validationData.data.surveyId,
          surveyTitle: validationData.data.surveyTitle
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('💥 Erro ao usar magic link:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}