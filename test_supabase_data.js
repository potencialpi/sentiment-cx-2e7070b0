import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (usando as chaves reais do projeto)
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseData() {
  console.log('🔍 Verificando dados de texto no Supabase...');
  
  try {
    // 1. Verificar surveys disponíveis
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title, current_responses')
      .limit(5);
    
    if (surveysError) {
      console.error('❌ Erro ao buscar surveys:', surveysError);
      return;
    }
    
    console.log('📊 Surveys encontradas:', surveys?.length || 0);
    if (surveys && surveys.length > 0) {
      console.log('Surveys:', surveys.map(s => ({ id: s.id, title: s.title, responses: s.current_responses })));
    }
    
    // 2. Verificar responses com dados JSONB
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('id, survey_id, responses, sentiment_score, sentiment_category')
      .limit(10);
    
    if (responsesError) {
      console.error('❌ Erro ao buscar responses:', responsesError);
    } else {
      console.log('📝 Responses encontradas:', responses?.length || 0);
      if (responses && responses.length > 0) {
        responses.forEach((response, index) => {
          console.log(`Response ${index + 1}:`, {
            id: response.id,
            survey_id: response.survey_id,
            hasResponsesData: !!response.responses,
            responsesType: typeof response.responses,
            sentiment_score: response.sentiment_score,
            sentiment_category: response.sentiment_category
          });
          
          // Verificar se há dados de texto no JSONB
          if (response.responses && typeof response.responses === 'object') {
            const textData = [];
            Object.entries(response.responses).forEach(([key, value]) => {
              if (typeof value === 'string' && value.trim().length > 0) {
                textData.push({ key, value: value.substring(0, 100) + '...' });
              }
            });
            if (textData.length > 0) {
              console.log('  📄 Dados de texto encontrados:', textData);
            }
          }
        });
      }
    }
    
    // 3. Verificar question_responses com answer_text
    const { data: questionResponses, error: qResponsesError } = await supabase
      .from('question_responses')
      .select('id, response_id, question_id, answer_text, answer_rating, sentiment_score, sentiment_label')
      .not('answer_text', 'is', null)
      .limit(10);
    
    if (qResponsesError) {
      console.error('❌ Erro ao buscar question_responses:', qResponsesError);
    } else {
      console.log('💬 Question responses com texto:', questionResponses?.length || 0);
      if (questionResponses && questionResponses.length > 0) {
        questionResponses.forEach((qr, index) => {
          console.log(`Question Response ${index + 1}:`, {
            id: qr.id,
            response_id: qr.response_id,
            question_id: qr.question_id,
            answer_text: qr.answer_text?.substring(0, 100) + '...',
            answer_rating: qr.answer_rating,
            sentiment_score: qr.sentiment_score,
            sentiment_label: qr.sentiment_label
          });
        });
      }
    }
    
    // 4. Resumo final
    const totalTextResponses = (responses?.filter(r => r.responses && typeof r.responses === 'object').length || 0) + 
                              (questionResponses?.length || 0);
    
    console.log('\n📈 RESUMO:');
    console.log(`- Surveys: ${surveys?.length || 0}`);
    console.log(`- Responses com dados JSONB: ${responses?.filter(r => r.responses).length || 0}`);
    console.log(`- Question responses com texto: ${questionResponses?.length || 0}`);
    console.log(`- Total de respostas com texto: ${totalTextResponses}`);
    
    if (totalTextResponses === 0) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO: Não há dados de texto disponíveis no Supabase!');
      console.log('   Isso explica por que a análise de sentimento não aparece.');
    } else {
      console.log('\n✅ Dados de texto encontrados - Análise de sentimento deveria funcionar.');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testSupabaseData();