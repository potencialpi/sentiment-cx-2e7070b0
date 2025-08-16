// Teste da função de análise de sentimento
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSentimentAnalysis() {
  console.log('🧪 Testando análise de sentimento...');
  
  try {
    // Textos de teste com diferentes sentimentos
    const testTexts = [
      'Este produto é excelente! Estou muito satisfeito.',
      'Não gostei nada, muito ruim e caro.',
      'O produto é ok, nada demais.',
      'Adorei! Super recomendo, é fantástico!',
      'Péssimo atendimento, nunca mais compro aqui.'
    ];
    
    // Simular um response_id para teste
    const testResponseId = 'test-' + Date.now();
    
    console.log('📝 Textos para análise:');
    testTexts.forEach((text, index) => {
      console.log(`  ${index + 1}. "${text}"`);
    });
    
    // Chamar a função de análise de sentimento
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        responseId: testResponseId,
        texts: testTexts
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('\n✅ Análise de sentimento concluída!');
    console.log('📊 Resultados individuais:');
    
    result.results.forEach((sentiment, index) => {
      console.log(`  ${index + 1}. ${sentiment.label.toUpperCase()} (score: ${sentiment.score.toFixed(2)}, confiança: ${(sentiment.confidence * 100).toFixed(1)}%)`);
    });
    
    console.log('\n📈 Resumo geral:');
    console.log(`  • Positivos: ${result.summary.positive}`);
    console.log(`  • Neutros: ${result.summary.neutral}`);
    console.log(`  • Negativos: ${result.summary.negative}`);
    console.log(`  • Score médio: ${result.summary.averageScore.toFixed(2)}`);
    console.log(`  • Confiança média: ${(result.summary.averageConfidence * 100).toFixed(1)}%`);
    
    // Verificar se foi salvo no banco de dados
    console.log('\n🔍 Verificando se foi salvo no banco...');
    const { data: sentimentData, error } = await supabase
      .from('sentiment_analysis')
      .select('*')
      .eq('response_id', testResponseId)
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar dados salvos:', error.message);
    } else {
      console.log('✅ Dados salvos com sucesso no banco!');
      console.log(`   ID: ${sentimentData.id}`);
      console.log(`   Response ID: ${sentimentData.response_id}`);
      console.log(`   Analisado em: ${sentimentData.analyzed_at}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar o teste
testSentimentAnalysis();