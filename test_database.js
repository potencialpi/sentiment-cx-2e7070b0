import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    console.log('🔍 Verificando dados nas tabelas...');
    
    // Verificar surveys
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title, created_at, current_responses')
      .limit(5);
    
    if (surveysError) {
      console.error('❌ Erro ao buscar surveys:', surveysError);
    } else {
      console.log(`📊 Total de surveys encontradas: ${surveys.length}`);
      surveys.forEach(survey => {
        console.log(`  - ${survey.title} (${survey.current_responses} respostas)`);
      });
    }
    
    // Verificar questions
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_text, question_type, survey_id')
      .limit(10);
    
    if (questionsError) {
      console.error('❌ Erro ao buscar questions:', questionsError);
    } else {
      console.log(`❓ Total de questões encontradas: ${questions.length}`);
      questions.forEach(question => {
        console.log(`  - ${question.question_text} (${question.question_type})`);
      });
    }
    
    // Verificar responses
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('id, survey_id, sentiment_category, created_at')
      .limit(5);
    
    if (responsesError) {
      console.error('❌ Erro ao buscar responses:', responsesError);
    } else {
      console.log(`💬 Total de respostas encontradas: ${responses.length}`);
      responses.forEach(response => {
        console.log(`  - Resposta ${response.id.substring(0, 8)}... (${response.sentiment_category || 'sem análise'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testDatabase();