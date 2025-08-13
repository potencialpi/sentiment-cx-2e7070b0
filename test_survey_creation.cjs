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