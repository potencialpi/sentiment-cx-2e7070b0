const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testUseMagicLink() {
  try {
    console.log('🔍 Testando Edge Function magic-link com ação "use"...')
    console.log('🔗 Token:', '9I1oOgGwnEcKhSVS4euNEQ3DwcYR5aRm')
    
    const { data, error } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'use',
        token: '9I1oOgGwnEcKhSVS4euNEQ3DwcYR5aRm'
      }
    })
    
    console.log('\n📋 RESULTADO:')
    console.log('Data:', JSON.stringify(data, null, 2))
    console.log('Error:', JSON.stringify(error, null, 2))
    
    if (error) {
      console.log('\n❌ ERRO DETECTADO:')
      console.log('- Mensagem:', error.message)
      console.log('- Detalhes:', error.details)
      console.log('- Hint:', error.hint)
      console.log('- Code:', error.code)
    }
    
    if (data && !data.success) {
      console.log('\n⚠️ RESPOSTA DE FALHA:')
      console.log('- Success:', data.success)
      console.log('- Error:', data.error)
    }
    
    if (data && data.success) {
      console.log('\n✅ SUCESSO!')
      console.log('- Message:', data.message)
      console.log('- Session ID:', data.data?.session?.access_token?.substring(0, 20) + '...')
      console.log('- User ID:', data.data?.user?.id)
      console.log('- Survey ID:', data.data?.surveyData?.surveyId)
    }
    
  } catch (err) {
    console.error('\n💥 ERRO CAPTURADO:', err)
    console.error('- Message:', err.message)
    console.error('- Stack:', err.stack)
  }
}

testUseMagicLink()