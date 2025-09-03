import { createClient } from '@supabase/supabase-js';

// Configuração direta do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

// Replicar a lógica do fetchRealSurveyData
async function testRealDataProcessing() {
  console.log('🔍 Testando processamento de dados reais...');
  
  try {
    const surveyId = 'a7faa48b-7ef4-4085-8149-0703a6a9b9e5';
    
    console.log(`📊 Buscando dados para survey: ${surveyId}`);
    
    // 1. Buscar respostas
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('survey_id', surveyId);
    
    if (responsesError) {
      console.error('❌ Erro ao buscar responses:', responsesError);
      return;
    }
    
    console.log(`📝 Responses encontradas: ${responses?.length || 0}`);
    
    // 2. Buscar perguntas
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('survey_id', surveyId);
    
    if (questionsError) {
      console.error('❌ Erro ao buscar questions:', questionsError);
      return;
    }
    
    console.log(`❓ Questions encontradas: ${questions?.length || 0}`);
    
    // 3. Buscar question_responses (pode dar erro de permissão)
    const { data: questionResponses, error: qResponsesError } = await supabase
      .from('question_responses')
      .select('*')
      .in('response_id', responses?.map(r => r.id) || []);
    
    if (qResponsesError) {
      console.log('⚠️  Erro ao buscar question_responses (esperado):', qResponsesError.message);
    } else {
      console.log(`💬 Question responses encontradas: ${questionResponses?.length || 0}`);
    }
    
    // 4. Processar dados como no realDataFetcher
    const textResponses = [];
    const ratings = [];
    const satisfaction = [];
    
    // Processar responses JSONB
    responses?.forEach(response => {
      if (response.responses && typeof response.responses === 'object') {
        Object.values(response.responses).forEach((value) => {
          if (typeof value === 'number' && value >= 1 && value <= 10) {
            ratings.push(value);
            satisfaction.push(value);
          } else if (typeof value === 'string' && value.trim()) {
            textResponses.push(value.trim());
          }
        });
      }
    });
    
    // Processar question_responses se disponível
    questionResponses?.forEach(qResponse => {
      if (qResponse.answer_rating !== null && qResponse.answer_rating !== undefined) {
        ratings.push(qResponse.answer_rating);
        satisfaction.push(qResponse.answer_rating);
      }
      
      if (qResponse.answer_text && qResponse.answer_text.trim()) {
        textResponses.push(qResponse.answer_text.trim());
      }
    });
    
    console.log('\n📈 RESULTADO DO PROCESSAMENTO:');
    console.log(`- Ratings: ${ratings.length}`);
    console.log(`- Satisfaction: ${satisfaction.length}`);
    console.log(`- Text Responses: ${textResponses.length}`);
    
    if (textResponses.length > 0) {
      console.log('\n📄 AMOSTRAS DE TEXTO:');
      textResponses.slice(0, 5).forEach((text, index) => {
        console.log(`  ${index + 1}. "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      });
      
      console.log('\n✅ SUCESSO: Dados de texto processados corretamente!');
      console.log('   A análise de sentimento deveria funcionar.');
      
      // Simular o que acontece no VortexNeuralAnalytics
      console.log('\n🧠 SIMULANDO ANÁLISE TEMÁTICA:');
      console.log(`   - textResponses.length: ${textResponses.length}`);
      console.log(`   - Condição para análise: textResponses.length > 0 = ${textResponses.length > 0}`);
      
    } else {
      console.log('\n❌ PROBLEMA: Nenhum dado de texto processado!');
      console.log('   Isso explica por que a análise de sentimento não aparece.');
      console.log('   Verificar se o processamento JSONB está correto.');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testRealDataProcessing();