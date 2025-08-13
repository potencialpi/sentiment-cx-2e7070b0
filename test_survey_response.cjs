const { createClient } = require('@supabase/supabase-js');

// Verificação de variáveis de ambiente
if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  console.error('❌ SUPABASE_URL não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_URL');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}


// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSurveyResponse() {
  console.log('🧪 Testando funcionalidade SurveyResponse...');
  
  try {
    // 1. Verificar se existem pesquisas ativas
    console.log('\n1. Verificando pesquisas ativas...');
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title, unique_link, status, current_responses, max_responses')
      .eq('status', 'active')
      .limit(5);
    
    if (surveysError) {
      console.error('❌ Erro ao buscar pesquisas:', surveysError.message);
      return;
    }
    
    if (!surveys || surveys.length === 0) {
      console.log('⚠️ Nenhuma pesquisa ativa encontrada');
      return;
    }
    
    console.log(`✅ Encontradas ${surveys.length} pesquisas ativas:`);
    surveys.forEach(survey => {
      console.log(`   - ${survey.title} (${survey.unique_link}) - ${survey.current_responses}/${survey.max_responses}`);
    });
    
    // 2. Testar busca por unique_link
    const testSurvey = surveys[0];
    console.log(`\n2. Testando busca por unique_link: ${testSurvey.unique_link}`);
    
    const { data: surveyData, error: surveyError } = await supabase
      .from('surveys')
      .select('*')
      .eq('unique_link', testSurvey.unique_link)
      .eq('status', 'active')
      .single();
    
    if (surveyError) {
      console.error('❌ Erro ao buscar pesquisa por unique_link:', surveyError.message);
      return;
    }
    
    console.log('✅ Pesquisa encontrada por unique_link:', surveyData.title);
    
    // 3. Verificar se há perguntas para esta pesquisa
    console.log('\n3. Verificando perguntas da pesquisa...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('survey_id', surveyData.id)
      .order('question_order');
    
    if (questionsError) {
      console.error('❌ Erro ao buscar perguntas:', questionsError.message);
      return;
    }
    
    if (!questions || questions.length === 0) {
      console.log('⚠️ Nenhuma pergunta encontrada para esta pesquisa');
      return;
    }
    
    console.log(`✅ Encontradas ${questions.length} perguntas`);
    questions.forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.question_text} (${q.question_type})`);
    });
    
    // 4. Testar inserção de resposta
    console.log('\n4. Testando inserção de resposta...');
    const testRespondentId = crypto.randomUUID();
    const testResponses = {};
    
    questions.forEach(q => {
      if (q.question_type === 'multiple_choice') {
        testResponses[q.id] = q.options ? q.options[0] : 'Opção 1';
      } else if (q.question_type === 'rating') {
        testResponses[q.id] = 5;
      } else {
        testResponses[q.id] = 'Resposta de teste';
      }
    });
    
    const { data: responseData, error: responseError } = await supabase
      .from('responses')
      .insert({
        survey_id: surveyData.id,
        respondent_id: testRespondentId,
        responses: testResponses
      })
      .select()
      .single();
    
    if (responseError) {
      console.error('❌ Erro ao inserir resposta:', responseError.message);
      return;
    }
    
    console.log('✅ Resposta inserida com sucesso:', responseData.id);
    
    // 5. Testar atualização do contador
    console.log('\n5. Testando atualização do contador...');
    const { error: updateError } = await supabase
      .from('surveys')
      .update({ current_responses: surveyData.current_responses + 1 })
      .eq('id', surveyData.id);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar contador:', updateError.message);
      return;
    }
    
    console.log('✅ Contador atualizado com sucesso');
    
    console.log('\n🎉 Todos os testes passaram! A funcionalidade SurveyResponse deve estar funcionando.');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

testSurveyResponse();