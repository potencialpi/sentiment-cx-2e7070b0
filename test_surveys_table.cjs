const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testSurveysTable() {
  try {
    console.log('🔍 TESTANDO TABELA SURVEYS')
    
    // Tentar acessar a tabela surveys
    const { data, error } = await supabase
      .from('surveys')
      .select('id, title, created_at')
      .limit(5)
    
    if (error) {
      console.error('❌ ERRO AO ACESSAR TABELA SURVEYS:', error.message)
      console.error('Código:', error.code)
      console.error('Detalhes:', error.details)
      console.error('Hint:', error.hint)
      
      if (error.code === 'PGRST116') {
        console.log('\n💡 A tabela surveys não existe ou não está acessível')
        console.log('Isso pode estar causando o erro na Edge Function magic-link')
      }
      
      return false
    }
    
    console.log('✅ TABELA SURVEYS EXISTE')
    console.log('Registros encontrados:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('\n📋 PRIMEIROS REGISTROS:')
      data.forEach((survey, index) => {
        console.log(`${index + 1}. ID: ${survey.id}, Título: ${survey.title || 'Sem título'}`)
      })
    } else {
      console.log('\n⚠️ Tabela surveys existe mas está vazia')
      console.log('Isso pode causar problemas na validação de surveyId na Edge Function')
    }
    
    return true
    
  } catch (err) {
    console.error('💥 ERRO INESPERADO:', err)
    console.error('Message:', err.message)
    console.error('Stack:', err.stack)
    return false
  }
}

async function testCreateSurvey() {
  try {
    console.log('\n🧪 TENTANDO CRIAR UMA SURVEY DE TESTE...')
    
    const { data, error } = await supabase
      .from('surveys')
      .insert({
        title: 'Survey de Teste para Magic Link',
        description: 'Survey criada automaticamente para testar magic links',
        status: 'active'
      })
      .select()
    
    if (error) {
      console.error('❌ ERRO AO CRIAR SURVEY:', error.message)
      console.error('Código:', error.code)
      console.error('Detalhes:', error.details)
      return null
    }
    
    console.log('✅ SURVEY DE TESTE CRIADA:')
    console.log('ID:', data[0]?.id)
    console.log('Título:', data[0]?.title)
    
    return data[0]?.id
    
  } catch (err) {
    console.error('💥 ERRO AO CRIAR SURVEY:', err)
    return null
  }
}

testSurveysTable()
  .then(async (surveysExist) => {
    if (surveysExist) {
      console.log('\n🎯 TABELA SURVEYS ESTÁ FUNCIONANDO')
      
      // Tentar criar uma survey de teste se não houver nenhuma
      const { data: existingSurveys } = await supabase
        .from('surveys')
        .select('id')
        .limit(1)
      
      if (!existingSurveys || existingSurveys.length === 0) {
        const surveyId = await testCreateSurvey()
        if (surveyId) {
          console.log('\n✅ Survey de teste criada com ID:', surveyId)
          console.log('Agora você pode testar a Edge Function com surveyId:', surveyId)
        }
      }
    } else {
      console.log('\n❌ PROBLEMA COM TABELA SURVEYS DETECTADO')
      console.log('Isso explica o erro na Edge Function magic-link')
    }
  })
  .catch((err) => {
    console.error('💥 Falha no teste:', err)
  })