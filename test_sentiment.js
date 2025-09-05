// Teste da função de análise de sentimento
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    
    // Usar um response_id real do banco de dados
    const testResponseId = 'd813cf8d-c1bf-41a3-a425-60bb80a9d947'; // Survey ID que sabemos que existe
    
    // Criar um response real para teste
    const { data: responseData, error: responseError } = await supabase
      .from('responses')
      .insert({
        survey_id: testResponseId,
        respondent_id: crypto.randomUUID(),
        responses: { test_texts: testTexts }
      })
      .select()
      .single();
      
    if (responseError) {
      console.error('❌ Erro ao criar response de teste:', responseError.message);
      return;
    }
    
    const actualResponseId = responseData.id;
    console.log('📝 Response de teste criado:', actualResponseId);
    
    console.log('📝 Textos para análise:');
    testTexts.forEach((text, index) => {
      console.log(`  ${index + 1}. "${text}"`);
    });
    
    // Chamar a função de análise de sentimento
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        responseId: actualResponseId,
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
    const { data: sentimentData, error } = await supabaseAdmin
      .from('sentiment_analysis')
      .select('*')
      .eq('response_id', actualResponseId)
      .single();
      
    // Limpar dados de teste
    await supabaseAdmin.from('responses').delete().eq('id', actualResponseId);
    if (sentimentData) {
      await supabaseAdmin.from('sentiment_analysis').delete().eq('id', sentimentData.id);
    }
    
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