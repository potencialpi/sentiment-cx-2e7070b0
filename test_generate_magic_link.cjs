const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testGenerateMagicLink() {
  try {
    console.log('🔍 Testando geração de Magic Link...')
    
    const { data, error } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        email: 'teste@exemplo.com',
        surveyId: '1'
      }
    })
    
    console.log('\n📋 RESULTADO DA GERAÇÃO:')
    console.log('Data:', JSON.stringify(data, null, 2))
    console.log('Error:', JSON.stringify(error, null, 2))
    
    if (error) {
      console.log('\n❌ ERRO NA GERAÇÃO:')
      console.log('- Mensagem:', error.message)
      console.log('- Detalhes:', error.details)
      console.log('- Hint:', error.hint)
      console.log('- Code:', error.code)
      return null
    }
    
    if (data && data.success && data.data && data.data.token) {
      console.log('\n✅ MAGIC LINK GERADO COM SUCESSO!')
      console.log('- Token:', data.data.token)
      console.log('- Email:', data.data.email)
      console.log('- Survey ID:', data.data.surveyId)
      console.log('- Expires At:', data.data.expiresAt)
      
      // Agora testar o uso do token gerado
      console.log('\n🧪 Testando uso do token gerado...')
      
      const { data: useData, error: useError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'use',
          token: data.data.token
        }
      })
      
      console.log('\n📋 RESULTADO DO USO:')
      console.log('Data:', JSON.stringify(useData, null, 2))
      console.log('Error:', JSON.stringify(useError, null, 2))
      
      if (useError) {
        console.log('\n❌ ERRO NO USO:')
        console.log('- Mensagem:', useError.message)
        console.log('- Detalhes:', useError.details)
        console.log('- Hint:', useError.hint)
        console.log('- Code:', useError.code)
      } else if (useData && useData.success) {
        console.log('\n✅ TOKEN USADO COM SUCESSO!')
        console.log('- Message:', useData.message)
        console.log('- User ID:', useData.data?.user?.id)
        console.log('- Session:', useData.data?.session ? 'Criada' : 'Não criada')
      }
      
      return data.data.token
    } else {
      console.log('\n⚠️ RESPOSTA INESPERADA:')
      console.log('- Success:', data?.success)
      console.log('- Data:', data?.data)
      return null
    }
    
  } catch (err) {
    console.error('\n💥 ERRO CAPTURADO:', err)
    console.error('- Message:', err.message)
    console.error('- Stack:', err.stack)
    return null
  }
}

testGenerateMagicLink()
  .then((token) => {
    if (token) {
      console.log('\n🎯 TESTE CONCLUÍDO COM SUCESSO!')
      console.log('Token gerado:', token)
    } else {
      console.log('\n❌ TESTE FALHOU')
    }
  })
  .catch((err) => {
    console.error('💥 Falha no teste:', err)
  })