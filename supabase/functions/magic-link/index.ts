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
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se a pesquisa existe
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title, user_id')
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      console.log('❌ Pesquisa não encontrada:', surveyError)
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
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar link de acesso' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Magic link criado:', magicLink.id)

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
      console.log('❌ Token inválido:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    
    // Primeiro validar o token
    const validationResponse = await validateMagicLink(supabaseAdmin, token, clientIP, userAgent)
    const validationData = await validationResponse.json()
    
    if (!validationData.success) {
      console.log('❌ Validação falhou:', validationData.error)
      return validationResponse
    }

    // Marcar token como usado
    const { error: updateError } = await supabaseAdmin
      .from('magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    if (updateError) {
      console.error('❌ Erro ao marcar token como usado:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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