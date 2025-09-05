const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testSurveyAccessAndMagicLink() {
  try {
    console.log('🔍 TESTANDO ACESSO A SURVEYS E MAGIC LINK')
    console.log('=' .repeat(50))
    
    // 1. Primeiro, tentar acessar surveys ativas com unique_link (acesso público)
    console.log('\n1️⃣ Testando acesso público a surveys ativas...')
    const { data: publicSurveys, error: publicError } = await supabase
      .from('surveys')
      .select('id, title, status, unique_link, current_responses, max_responses')
      .eq('status', 'active')
      .not('unique_link', 'is', null)
      .limit(5)
    
    if (publicError) {
      console.log('✅ Acesso anônimo a surveys BLOQUEADO (comportamento esperado).')
      console.log(`   Detalhes: ${publicError.message} (code=${publicError.code || 'N/A'})`)

      // Continuar o teste criando/buscando uma survey ativa via service role
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey) {
        console.error('❌ Service Role Key não encontrada (defina SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_SERVICE_ROLE_KEY no .env.local)')
        return false
      }

      const adminSupabase = createClient(
        process.env.VITE_SUPABASE_URL,
        serviceRoleKey
      )

      // Tentar encontrar uma survey ativa existente
      let testSurveyId = null
      const { data: existingActive, error: findErr } = await adminSupabase
        .from('surveys')
        .select('id')
        .eq('status', 'active')
        .not('unique_link', 'is', null)
        .limit(1)

      if (findErr) {
        console.error('❌ Erro ao buscar survey ativa com service role:', findErr.message)
        return false
      }

      if (existingActive && existingActive.length > 0) {
        testSurveyId = existingActive[0].id
        console.log(`🔎 Usando survey ativa existente: ${testSurveyId}`)
      } else {
        console.log('🧪 Nenhuma survey ativa encontrada. Criando survey de teste com service role...')
        const { data: created, error: createErr } = await adminSupabase
          .from('surveys')
          .insert({
            title: 'Survey de Teste para Magic Link',
            description: 'Survey criada automaticamente para testar magic links',
            status: 'active',
            unique_link: 'test-magic-link-' + Date.now(),
            max_responses: 100,
            current_responses: 0,
            user_id: '00000000-0000-0000-0000-000000000000'
          })
          .select('id')
          .single()

        if (createErr) {
          console.error('❌ Erro ao criar survey de teste (service role):', createErr.message)
          return false
        }

        testSurveyId = created.id
        console.log(`✅ Survey de teste criada: ${testSurveyId}`)
      }

      // Prosseguir com geração do magic link
      console.log(`\n2️⃣ Testando Magic Link com Survey ID: ${testSurveyId}...`)
      const { data: magicLinkData, error: magicLinkError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'generate',
          email: 'teste@exemplo.com',
          surveyId: testSurveyId.toString()
        }
      })

      if (magicLinkError) {
        console.error('❌ ERRO na geração do Magic Link:', magicLinkError.message)
        console.error('Detalhes:', magicLinkError.details)
        console.error('Hint:', magicLinkError.hint)
        console.error('Code:', magicLinkError.code)
        return false
      }

      // Aceitar resposta com magicLinkUrl e extrair token da URL
      if (!(magicLinkData && magicLinkData.success && magicLinkData.data?.magicLinkUrl)) {
        console.log('⚠️ Resposta inesperada ao gerar Magic Link:', magicLinkData)
        return false
      }

      const magicLinkUrl = magicLinkData.data.magicLinkUrl
      let tokenFromUrl = null
      let surveyIdFromUrl = null
      try {
        const parsed = new URL(magicLinkUrl)
        tokenFromUrl = parsed.searchParams.get('token')
        surveyIdFromUrl = parsed.searchParams.get('surveyId')
      } catch (e) {
        console.error('❌ URL do magic link inválida:', magicLinkUrl, e?.message)
        return false
      }

      if (!tokenFromUrl) {
        console.error('❌ Token ausente no magicLinkUrl:', magicLinkUrl)
        return false
      }

      console.log('✅ MAGIC LINK GERADO COM SUCESSO!')
      console.log('URL:', magicLinkUrl)
      console.log('Token:', tokenFromUrl)
      console.log('Survey ID:', surveyIdFromUrl || testSurveyId)
      console.log('Expires At:', magicLinkData.data?.expiresAt)

      // Testar uso do magic link
      console.log('\n3️⃣ Testando uso do Magic Link...')
      const { data: useData, error: useError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'use',
          token: tokenFromUrl
        }
      })

      if (useError) {
        console.error('❌ ERRO no uso do Magic Link:', useError.message)
        console.error('Detalhes:', useError.details)
        return false
      }

      if (useData && useData.success) {
        console.log('✅ MAGIC LINK USADO COM SUCESSO!')
        console.log('Message:', useData.message)
        console.log('User ID:', useData.data?.user?.id)
        console.log('Session:', useData.data?.session ? 'Criada' : 'Não criada')
        console.log('\n🎯 TODOS OS TESTES PASSARAM (com anon bloqueado)!')
        console.log('✅ Acesso anônimo a surveys: BLOQUEADO (OK)')
        console.log('✅ Geração de magic link: OK')
        console.log('✅ Uso de magic link: OK')
        return true
      } else {
        console.log('⚠️ Magic Link usado mas resposta inesperada:', useData)
        return false
      }
    }
    
    console.log('✅ ACESSO PÚBLICO A SURVEYS FUNCIONANDO')
    console.log('Surveys ativas encontradas:', publicSurveys?.length || 0)
    
    if (publicSurveys && publicSurveys.length > 0) {
      console.log('\n📋 SURVEYS ATIVAS DISPONÍVEIS:')
      publicSurveys.forEach((survey, index) => {
        console.log(`${index + 1}. ID: ${survey.id}, Título: ${survey.title || 'Sem título'}`)
        console.log(`   Status: ${survey.status}, Link: ${survey.unique_link ? 'Sim' : 'Não'}`)
        console.log(`   Respostas: ${survey.current_responses || 0}/${survey.max_responses || 'Ilimitado'}`)
      })
      
      // 2. Testar magic link com uma survey existente
      const testSurveyId = publicSurveys[0].id
      console.log(`\n2️⃣ Testando Magic Link com Survey ID: ${testSurveyId}...`)
      
      const { data: magicLinkData, error: magicLinkError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'generate',
          email: 'teste@exemplo.com',
          surveyId: testSurveyId.toString()
        }
      })
      
      if (magicLinkError) {
        console.error('❌ ERRO na geração do Magic Link:', magicLinkError.message)
        console.error('Detalhes:', magicLinkError.details)
        console.error('Hint:', magicLinkError.hint)
        console.error('Code:', magicLinkError.code)
        
        return false
      }
      
      if (magicLinkData && magicLinkData.success) {
        console.log('✅ MAGIC LINK GERADO COM SUCESSO!')
        console.log('Token:', magicLinkData.data?.token)
        console.log('Email:', magicLinkData.data?.email)
        console.log('Survey ID:', magicLinkData.data?.surveyId)
        console.log('Expires At:', magicLinkData.data?.expiresAt)
        
        // 3. Testar uso do magic link
        console.log('\n3️⃣ Testando uso do Magic Link...')
        
        const { data: useData, error: useError } = await supabase.functions.invoke('magic-link', {
          body: {
            action: 'use',
            token: magicLinkData.data.token
          }
        })
        
        if (useError) {
          console.error('❌ ERRO no uso do Magic Link:', useError.message)
          console.error('Detalhes:', useError.details)
          return false
        }
        
        if (useData && useData.success) {
          console.log('✅ MAGIC LINK USADO COM SUCESSO!')
          console.log('Message:', useData.message)
          console.log('User ID:', useData.data?.user?.id)
          console.log('Session:', useData.data?.session ? 'Criada' : 'Não criada')
          
          console.log('\n🎯 TODOS OS TESTES PASSARAM!')
          console.log('✅ Acesso público a surveys: OK')
          console.log('✅ Geração de magic link: OK')
          console.log('✅ Uso de magic link: OK')
          
          return true
        } else {
          console.log('⚠️ Magic Link usado mas resposta inesperada:', useData)
          return false
        }
        
      } else {
        console.log('⚠️ Magic Link gerado mas resposta inesperada:', magicLinkData)
        return false
      }
      
    } else {
      console.log('\n⚠️ NENHUMA SURVEY ATIVA ENCONTRADA')
      console.log('Para testar magic links, você precisa de pelo menos uma survey ativa com unique_link')
      
      // Tentar criar uma survey de teste
      console.log('\n🧪 Tentando criar uma survey de teste...')
      
      // Primeiro, tentar autenticar com service role se disponível
      const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const adminSupabase = createClient(
          process.env.VITE_SUPABASE_URL,
          serviceRoleKey
        )
        
        const { data: testSurvey, error: createError } = await adminSupabase
          .from('surveys')
          .insert({
            title: 'Survey de Teste para Magic Link',
            description: 'Survey criada automaticamente para testar magic links',
            status: 'active',
            unique_link: 'test-magic-link-' + Date.now(),
            max_responses: 100,
            current_responses: 0,
            user_id: '00000000-0000-0000-0000-000000000000' // UUID fictício
          })
          .select()
        
        if (createError) {
          console.error('❌ Erro ao criar survey de teste:', createError.message)
          return false
        }
        
        console.log('✅ Survey de teste criada:', testSurvey[0]?.id)
        console.log('Agora você pode executar este teste novamente')
      } else {
        console.log('❌ VITE_SUPABASE_SERVICE_ROLE_KEY não encontrada')
        console.log('Não é possível criar survey de teste automaticamente')
      }
      
      return false
    }
    
  } catch (err) {
    console.error('💥 ERRO INESPERADO:', err)
    console.error('Message:', err.message)
    console.error('Stack:', err.stack)
    return false
  }
}

testSurveyAccessAndMagicLink()
  .then((success) => {
    if (success) {
      console.log('\n🎉 TESTE COMPLETO: SUCESSO!')
      console.log('A Edge Function magic-link está funcionando corretamente')
    } else {
      console.log('\n❌ TESTE COMPLETO: FALHOU')
      console.log('Verifique os erros acima para diagnosticar o problema')
    }
  })
  .catch((err) => {
    console.error('💥 Falha no teste completo:', err)
  })