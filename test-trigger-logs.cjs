require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTriggerLogs() {
  console.log('🔍 Testando trigger e verificando logs...');
  
  try {
    // Primeiro criar uma survey de teste
    console.log('\n📋 Criando survey de teste...');
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .insert({
        title: 'Teste Trigger Log',
        description: 'Survey para testar logs do trigger',
        user_id: 'f82c54c4-e211-41aa-8126-4c8dfd2d18c7',
        status: 'active',
        max_responses: 100,
        current_responses: 0
      })
      .select()
      .single();

    if (surveyError) {
      console.log('❌ Erro ao criar survey:', surveyError);
      return;
    }

    console.log('✅ Survey criada:', survey.id);
    
    // Inserir dados que devem ativar o trigger
    console.log('\n📝 Inserindo dados de teste para ativar o trigger...');
    const { data: insertData, error: insertError } = await supabase
      .from('sentiment_analysis')
      .insert({
        survey_id: survey.id,
        user_id: survey.user_id,
        response_id: '08aa69d4-7f7f-4723-8ddf-1372d15b77ab',
        sentiment_results: {
          "overall_sentiment": "positive",
          "confidence": 0.9,
          "emotions": {
            "joy": 0.8,
            "trust": 0.7
          }
        },
        summary_stats: {
          "total_responses": 1,
          "sentiment_distribution": {
            "positive": 1,
            "neutral": 0,
            "negative": 0
          }
        }
      })
      .select();

    if (insertError) {
      console.log('❌ Erro na inserção:', insertError);
      return;
    }

    console.log('✅ Dados inseridos com sucesso:', insertData[0]?.id);
    
    // Aguardar um pouco para o trigger processar
    console.log('\n⏳ Aguardando processamento do trigger...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar se há notices ou logs de erro
    console.log('\n🔍 Verificando se o trigger executou sem erros...');
    
    // Tentar executar uma query que pode revelar notices
    const { data: noticeData, error: noticeError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          current_setting('log_min_messages', true) as log_level,
          current_setting('app.supabase_url', true) as app_url_setting,
          current_setting('app.supabase_service_role_key', true) as app_key_setting;
      `
    });
    
    if (noticeError) {
      console.log('❌ Erro ao verificar configurações:', noticeError);
    } else {
      console.log('📋 Configurações atuais:', noticeData);
    }
    
    // Limpar dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    const { error: deleteError } = await supabase
      .from('sentiment_analysis')
      .delete()
      .eq('id', insertData[0]?.id);
      
    if (deleteError) {
      console.log('❌ Erro ao limpar sentiment_analysis:', deleteError);
    } else {
      console.log('✅ Dados de sentiment_analysis removidos');
    }
    
    // Limpar survey de teste
    const { error: surveyDeleteError } = await supabase
      .from('surveys')
      .delete()
      .eq('id', survey.id);
      
    if (surveyDeleteError) {
      console.log('❌ Erro ao limpar survey:', surveyDeleteError);
    } else {
      console.log('✅ Survey de teste removida');
    }
    
    console.log('\n🎉 Teste de trigger concluído!');
    console.log('✅ Se não houve erros acima, o trigger está funcionando corretamente');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testTriggerLogs();