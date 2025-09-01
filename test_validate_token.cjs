const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testValidateToken() {
  try {
    console.log('🔍 Testando Edge Function magic-link com ação "validate"...')
    console.log('🔗 Token:', '9I1oOgGwnEcKhSVS4euNEQ3DwcYR5aRm')
    
    const { data, error } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'validate',
        token: '9I1oOgGwnEcKhSVS4euNEQ3DwcYR5aRm'
      }
    })
    
    console.log('\n📋 RESULTADO DA VALIDAÇÃO:')
    console.log('Data:', JSON.stringify(data, null, 2))
    console.log('Error:', JSON.stringify(error, null, 2))
    
    if (error) {
      console.log('\n❌ ERRO DETECTADO:')
      console.log('- Mensagem:', error.message)
      console.log('- Detalhes:', error.details)
    }
    
    if (data && !data.success) {
      console.log('\n⚠️ RESPOSTA DE FALHA:')
      console.log('- Success:', data.success)
      console.log('- Error:', data.error)
    }
    
    if (data && data.success) {
      console.log('\n✅ VALIDAÇÃO SUCESSO!')
      console.log('- Message:', data.message)
      console.log('- Email:', data.data?.email)
      console.log('- Survey ID:', data.data?.surveyId)
      console.log('- Survey Title:', data.data?.surveyTitle)
    }
    
  } catch (err) {
    console.error('\n💥 ERRO CAPTURADO:', err)
    console.error('- Message:', err.message)
  }
}

testValidateToken()