const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSurveyCreation() {
  console.log('🧪 Testando criação de pesquisa...');
  
  try {
    // Simular criação de pesquisa (sem a coluna 'questions')
    const surveyData = {
      title: 'Teste de Pesquisa',
      description: 'Pesquisa de teste para verificar se o erro foi corrigido',
      status: 'active',
      unique_link: 'test-' + Date.now(),
      user_id: '00000000-0000-0000-0000-000000000000', // UUID fictício
      max_responses: 100,
      current_responses: 0
    };

    console.log('📝 Tentando criar pesquisa na tabela surveys...');
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .insert(surveyData)
      .select()
      .single();

    if (surveyError) {
      console.error('❌ Erro ao criar pesquisa:', surveyError);
      return;
    }

    console.log('✅ Pesquisa criada com sucesso:', survey.id);

    // Agora testar criação de perguntas
    const questionsData = [
      {
        survey_id: survey.id,
        question_text: 'Qual é sua opinião sobre nosso produto?',
        question_type: 'text',
        question_order: 1,
        options: null
      },
      {
        survey_id: survey.id,
        question_text: 'Como você avalia nosso atendimento?',
        question_type: 'rating',
        question_order: 2,
        options: null
      }
    ];

    console.log('❓ Tentando criar perguntas na tabela questions...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .insert(questionsData)
      .select();

    if (questionsError) {
      console.error('❌ Erro ao criar perguntas:', questionsError);
      // Limpar pesquisa criada
      await supabase.from('surveys').delete().eq('id', survey.id);
      return;
    }

    console.log('✅ Perguntas criadas com sucesso:', questions.length, 'perguntas');

    // Limpar dados de teste
    console.log('🧹 Limpando dados de teste...');
    await supabase.from('questions').delete().eq('survey_id', survey.id);
    await supabase.from('surveys').delete().eq('id', survey.id);

    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('✅ O erro da coluna "questions" foi resolvido!');
    console.log('✅ Pesquisas podem ser criadas normalmente!');
    console.log('✅ Perguntas são salvas separadamente na tabela "questions"!');

  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

testSurveyCreation();