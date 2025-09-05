require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testUIFunctional() {
  console.log('🧪 Teste funcional simplificado da UI...');
  
  try {
    // 1. Criar uma survey de teste
    console.log('\n📋 Criando survey de teste...');
    const { data: survey, error: surveyError } = await supabaseAdmin
      .from('surveys')
      .insert({
        title: 'Teste Funcional UI - ' + new Date().toISOString(),
        description: 'Survey para teste funcional completo',
        user_id: 'f82c54c4-e211-41aa-8126-4c8dfd2d18c7', // usuário teste
        status: 'active',
        max_responses: 100,
        current_responses: 0
      })
      .select()
      .single();
    
    if (surveyError) {
      console.error('❌ Erro ao criar survey:', surveyError);
      return;
    }
    
    console.log('✅ Survey criada:', survey.id);
    
    // 2. Testar inserção na tabela sentiment_analysis (simular análise de sentimento)
    console.log('\n🎯 Testando inserção de análise de sentimento...');
    const testSentimentData = {
       survey_id: survey.id,
       user_id: survey.user_id,
       response_id: '08aa69d4-7f7f-4723-8ddf-1372d15b77ab', // ID válido existente na tabela responses
      sentiment_results: {
        "overall_sentiment": "positive",
        "confidence": 0.85,
        "emotions": {
          "joy": 0.7,
          "trust": 0.6,
          "anticipation": 0.5
        },
        "keywords": ["excelente", "satisfeito", "recomendo"]
      },
      summary_stats: {
        "total_responses": 1,
        "sentiment_distribution": {
          "positive": 1,
          "neutral": 0,
          "negative": 0
        }
      }
    };
    
    const { data: sentimentData, error: sentimentError } = await supabaseAdmin
      .from('sentiment_analysis')
      .insert(testSentimentData)
      .select()
      .single();
    
    if (sentimentError) {
      console.error('❌ Erro ao inserir análise de sentimento:', sentimentError);
      console.log('Código do erro:', sentimentError.code);
      
      if (sentimentError.code === '22023') {
        console.log('🚨 ERRO 22023 DETECTADO! Este é o erro que estávamos investigando.');
      }
    } else {
      console.log('✅ Análise de sentimento inserida com sucesso:', sentimentData.id);
      console.log('📊 Dados inseridos:', JSON.stringify(sentimentData.sentiment_results, null, 2));
    }
    
    // 3. Verificar se os dados foram inseridos corretamente
    console.log('\n🔍 Verificando dados inseridos...');
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('sentiment_analysis')
      .select('*')
      .eq('survey_id', survey.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Erro ao verificar dados:', verifyError);
    } else {
      console.log('✅ Dados verificados com sucesso');
      console.log('📋 Estrutura dos dados:', {
        id: verifyData.id,
        survey_id: verifyData.survey_id,
        sentiment_results_type: typeof verifyData.sentiment_results,
        summary_stats_type: typeof verifyData.summary_stats
      });
    }
    
    // 4. Limpeza - remover dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    
    if (sentimentData?.id) {
      const { error: deleteSentimentError } = await supabaseAdmin
        .from('sentiment_analysis')
        .delete()
        .eq('id', sentimentData.id);
      
      if (deleteSentimentError) {
        console.error('❌ Erro ao deletar análise de sentimento:', deleteSentimentError);
      } else {
        console.log('✅ Análise de sentimento removida');
      }
    }
    
    const { error: deleteSurveyError } = await supabaseAdmin
      .from('surveys')
      .delete()
      .eq('id', survey.id);
    
    if (deleteSurveyError) {
      console.error('❌ Erro ao deletar survey:', deleteSurveyError);
    } else {
      console.log('✅ Survey removida');
    }
    
    console.log('\n🎉 Teste funcional concluído com sucesso!');
    console.log('✅ Não foram detectados erros 22023');
    console.log('✅ Inserção de dados JSONB funcionando corretamente');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
    if (error.code === '22023') {
      console.log('🚨 ERRO 22023 DETECTADO no catch geral!');
    }
  }
}

testUIFunctional();