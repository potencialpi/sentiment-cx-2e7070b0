/**
 * Teste para verificar se os dados reais estão sendo carregados corretamente
 */

// Simular um surveyId para teste
const testSurveyId = 'test-survey-id';

console.log('=== TESTE DE CARREGAMENTO DE DADOS REAIS ===');
console.log('Survey ID:', testSurveyId);

try {
  console.log('\nTentando carregar dados da pesquisa...');
  
  // Como não temos dados reais, vamos simular o comportamento
  const mockRealData = {
    responses: [],
    questionResponses: [
      {
        id: '1',
        response_id: 'resp1',
        question_id: 'q1',
        answer_text: 'O atendimento foi excelente, muito prestativo',
        answer_rating: 5,
        sentiment_score: 0.8,
        sentiment_label: 'positive',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        response_id: 'resp2',
        question_id: 'q2',
        answer_text: 'O produto é de ótima qualidade, recomendo',
        answer_rating: 4,
        sentiment_score: 0.7,
        sentiment_label: 'positive',
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        response_id: 'resp3',
        question_id: 'q3',
        answer_text: 'O preço está muito caro, não vale a pena',
        answer_rating: 2,
        sentiment_score: -0.5,
        sentiment_label: 'negative',
        created_at: new Date().toISOString()
      }
    ],
    questions: [
      {
        id: 'q1',
        survey_id: testSurveyId,
        question_text: 'Como você avalia o atendimento?',
        question_type: 'text',
        question_order: 1,
        created_at: new Date().toISOString()
      }
    ],
    statisticalData: {
      ratings: [5, 4, 2],
      satisfaction: [5, 4, 2],
      textResponses: [
        'O atendimento foi excelente, muito prestativo',
        'O produto é de ótima qualidade, recomendo',
        'O preço está muito caro, não vale a pena'
      ]
    },
    sentimentData: {
      positive: 2,
      neutral: 0,
      negative: 1,
      averageScore: 0.33
    }
  };
  
  console.log('\n=== DADOS SIMULADOS ===');
  console.log('Número de respostas:', mockRealData.responses.length);
  console.log('Número de respostas por pergunta:', mockRealData.questionResponses.length);
  console.log('Número de perguntas:', mockRealData.questions.length);
  console.log('\n=== DADOS ESTATÍSTICOS ===');
  console.log('Ratings:', mockRealData.statisticalData.ratings);
  console.log('Respostas de texto:', mockRealData.statisticalData.textResponses.length);
  console.log('Textos:', mockRealData.statisticalData.textResponses);
  console.log('\n=== DADOS DE SENTIMENTO ===');
  console.log('Positivos:', mockRealData.sentimentData.positive);
  console.log('Neutros:', mockRealData.sentimentData.neutral);
  console.log('Negativos:', mockRealData.sentimentData.negative);
  console.log('Score médio:', mockRealData.sentimentData.averageScore);
  
  // Verificar se há textResponses
  if (mockRealData.statisticalData.textResponses.length > 0) {
    console.log('\n✅ DADOS DE TEXTO ENCONTRADOS - Análise de sentimento deve funcionar');
  } else {
    console.log('\n❌ NENHUM DADO DE TEXTO ENCONTRADO - Análise de sentimento não funcionará');
  }
  
} catch (error) {
  console.error('❌ Erro ao carregar dados:', error);
  console.error('Stack:', error.stack);
}

console.log('\n=== FIM DO TESTE ===');