const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testEdgeFunctionDebug() {
  try {
    console.log('🔍 Testando Edge Function magic-link com debug...')
    console.log('🔗 URL:', process.env.VITE_SUPABASE_URL)
    console.log('🔑 ANON KEY:', process.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
    
    // Teste simples com ação inválida para ver se a função responde
    const { data, error } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'test'
      }
    })
    
    console.log('\n📋 RESULTADO DO TESTE:')
    console.log('Data:', JSON.stringify(data, null, 2))
    console.log('Error:', JSON.stringify(error, null, 2))
    
    if (error) {
      console.log('\n❌ ERRO DETECTADO:')
      console.log('- Name:', error.name)
      console.log('- Message:', error.message)
      console.log('- Context:', JSON.stringify(error.context, null, 2))
    }
    
  } catch (err) {
    console.error('\n💥 ERRO CAPTURADO:', err)
    console.error('- Message:', err.message)
    console.error('- Stack:', err.stack)
  }
}

testEdgeFunctionDebug()