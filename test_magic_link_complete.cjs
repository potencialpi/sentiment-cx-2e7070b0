const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente necessárias não encontradas')
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl)
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  console.log('VITE_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
  process.exit(1)
}

const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

async function testEdgeFunctionDirectly() {
  console.log('🧪 Testando Edge Function diretamente...')
  console.log('=')
  
  try {
    // 1. Buscar uma pesquisa ativa
    console.log('1️⃣ Buscando pesquisa ativa...')
    const { data: surveys, error: surveyError } = await supabaseService
      .from('surveys')
      .select('*')
      .eq('status', 'active')
      .limit(1)
    
    if (surveyError) {
      throw new Error(`Erro ao buscar pesquisas: ${surveyError.message}`)
    }
    
    if (!surveys || surveys.length === 0) {
      throw new Error('Nenhuma pesquisa ativa encontrada')
    }
    
    const survey = surveys[0]
    console.log(`✅ Pesquisa encontrada: ${survey.title} (ID: ${survey.id})`)
    
    // 2. Testar geração com Service Role
    console.log('\n2️⃣ Testando geração com Service Role...')
    const testEmail = 'test@example.com'
    
    try {
      const { data: generateResult, error: generateError } = await supabaseService.functions.invoke('magic-link', {
        body: {
          action: 'generate',
          email: testEmail,
          surveyId: survey.id
        }
      })
      
      if (generateError) {
        console.log(`❌ Erro na geração (Service): ${generateError.message}`)
        console.log('Detalhes do erro:', generateError)
      } else {
        console.log('✅ Geração com Service Role: OK')
        console.log('Resultado:', generateResult)
      }
    } catch (err) {
      console.log(`❌ Exceção na geração (Service): ${err.message}`)
    }
    
    // 3. Testar geração com Anon Key
    console.log('\n3️⃣ Testando geração com Anon Key...')
    
    try {
      const { data: generateAnonResult, error: generateAnonError } = await supabaseAnon.functions.invoke('magic-link', {
        body: {
          action: 'generate',
          email: testEmail,
          surveyId: survey.id
        }
      })
      
      if (generateAnonError) {
        console.log(`❌ Erro na geração (Anon): ${generateAnonError.message}`)
        console.log('Detalhes do erro:', generateAnonError)
      } else {
        console.log('✅ Geração com Anon Key: OK')
        console.log('Resultado:', generateAnonResult)
      }
    } catch (err) {
      console.log(`❌ Exceção na geração (Anon): ${err.message}`)
    }
    
    // 4. Gerar um token válido para testes de validação
    console.log('\n4️⃣ Gerando token válido para testes...')
    
    const { data: validTokenResult, error: validTokenError } = await supabaseService.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        email: testEmail,
        surveyId: survey.id
      }
    })
    
    if (validTokenError || !validTokenResult?.success) {
      console.log('❌ Não foi possível gerar token válido para testes')
      return
    }
    
    // Extrair token da URL
    const url = new URL(validTokenResult.data.magicLinkUrl)
    const token = url.searchParams.get('token')
    
    if (!token) {
      console.log('❌ Token não encontrado na URL')
      return
    }
    
    console.log(`✅ Token gerado: ${token.substring(0, 10)}...`)
    
    // 5. Testar validação com Service Role
    console.log('\n5️⃣ Testando validação com Service Role...')
    
    try {
      const { data: validateResult, error: validateError } = await supabaseService.functions.invoke('magic-link', {
        body: {
          action: 'validate',
          token: token
        }
      })
      
      if (validateError) {
        console.log(`❌ Erro na validação (Service): ${validateError.message}`)
        console.log('Detalhes do erro:', validateError)
      } else {
        console.log('✅ Validação com Service Role: OK')
        console.log('Resultado:', validateResult)
      }
    } catch (err) {
      console.log(`❌ Exceção na validação (Service): ${err.message}`)
    }
    
    // 6. Testar validação com Anon Key
    console.log('\n6️⃣ Testando validação com Anon Key...')
    
    try {
      const { data: validateAnonResult, error: validateAnonError } = await supabaseAnon.functions.invoke('magic-link', {
        body: {
          action: 'validate',
          token: token
        }
      })
      
      if (validateAnonError) {
        console.log(`❌ Erro na validação (Anon): ${validateAnonError.message}`)
        console.log('Detalhes do erro:', validateAnonError)
      } else {
        console.log('✅ Validação com Anon Key: OK')
        console.log('Resultado:', validateAnonResult)
      }
    } catch (err) {
      console.log(`❌ Exceção na validação (Anon): ${err.message}`)
    }
    
    // 7. Testar uso com Service Role
    console.log('\n7️⃣ Testando uso com Service Role...')
    
    try {
      const { data: useResult, error: useError } = await supabaseService.functions.invoke('magic-link', {
        body: {
          action: 'use',
          token: token
        }
      })
      
      if (useError) {
        console.log(`❌ Erro no uso (Service): ${useError.message}`)
        console.log('Detalhes do erro:', useError)
      } else {
        console.log('✅ Uso com Service Role: OK')
        console.log('Resultado:', useResult)
      }
    } catch (err) {
      console.log(`❌ Exceção no uso (Service): ${err.message}`)
    }
    
    // 8. Testar uso com Anon Key
    console.log('\n8️⃣ Testando uso com Anon Key...')
    
    try {
      const { data: useAnonResult, error: useAnonError } = await supabaseAnon.functions.invoke('magic-link', {
        body: {
          action: 'use',
          token: token
        }
      })
      
      if (useAnonError) {
        console.log(`❌ Erro no uso (Anon): ${useAnonError.message}`)
        console.log('Detalhes do erro:', useAnonError)
      } else {
        console.log('✅ Uso com Anon Key: OK')
        console.log('Resultado:', useAnonResult)
      }
    } catch (err) {
      console.log(`❌ Exceção no uso (Anon): ${err.message}`)
    }
    
    console.log('\n🎉 TESTE DE EDGE FUNCTION CONCLUÍDO!')
    
  } catch (error) {
    console.error('\n❌ ERRO GERAL NO TESTE:', error.message)
    console.log('\n🔍 Detalhes do erro:')
    console.error(error)
  }
}

// Executar o teste
testEdgeFunctionDirectly()
  .then(() => {
    console.log('\n✅ Teste finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Falha no teste:', error)
    process.exit(1)
  })