require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testError22023() {
  console.log('🧪 Testando se o erro 22023 ainda persiste...');
  
  try {
    // Primeiro, vamos verificar se existe uma survey para usar
    const { data: surveys, error: surveyError } = await supabase
      .from('surveys')
      .select('id')
      .limit(1);
    
    if (surveyError) {
      console.error('❌ Erro ao buscar surveys:', surveyError);
      return;
    }
    
    if (!surveys || surveys.length === 0) {
      console.log('⚠️ Nenhuma survey encontrada. Criando uma survey de teste...');
      
      const { data: newSurvey, error: createError } = await supabase
        .from('surveys')
        .insert({
          title: 'Survey de Teste - Erro 22023',
          description: 'Survey criada para testar o erro 22023',
          questions: [
            {
              id: 1,
              type: 'text',
              question: 'Como você se sente sobre nosso produto?',
              required: true
            }
          ],
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erro ao criar survey:', createError);
        return;
      }
      
      surveys.push(newSurvey);
      console.log('✅ Survey de teste criada:', newSurvey.id);
    }
    
    const surveyId = surveys[0].id;
    console.log('📋 Usando survey ID:', surveyId);
    
    // Agora vamos tentar inserir uma resposta que deve disparar o trigger de análise de sentimento
    console.log('\n🔥 Tentando inserir resposta que pode causar erro 22023...');
    
    const testResponse = {
      survey_id: surveyId,
      respondent_id: '00000000-0000-0000-0000-000000000001', // UUID válido para teste
      responses: [
        "Este produto é absolutamente fantástico! Eu realmente amo usar ele todos os dias. A experiência do usuário é incrível e superou todas as minhas expectativas. Recomendo fortemente para todos!"
      ]
    };
    
    const { data: response, error: responseError } = await supabase
      .from('responses')
      .insert(testResponse)
      .select()
      .single();
    
    if (responseError) {
      console.error('❌ ERRO ENCONTRADO:', responseError);
      
      if (responseError.code === '22023') {
        console.log('\n🎯 CONFIRMADO: Erro 22023 "cannot extract elements from an object" ainda persiste!');
        console.log('📝 Este erro provavelmente está relacionado ao trigger de análise de sentimento');
        console.log('🔧 Possíveis soluções:');
        console.log('   1. Desabilitar temporariamente o trigger sentiment_analysis_trigger');
        console.log('   2. Configurar as variáveis app.supabase_url e app.supabase_service_role_key no banco');
        console.log('   3. Modificar o trigger para lidar melhor com configurações ausentes');
      } else {
        console.log('❓ Erro diferente encontrado:', responseError.code, responseError.message);
      }
      return;
    }
    
    console.log('✅ Resposta inserida com sucesso! ID:', response.id);
    console.log('🎉 O erro 22023 parece ter sido resolvido ou não foi reproduzido neste teste.');
    
    // Limpar o teste
    await supabase.from('responses').delete().eq('id', response.id);
    console.log('🧹 Resposta de teste removida');
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    
    if (err.message && err.message.includes('22023')) {
      console.log('\n🎯 CONFIRMADO: Erro 22023 capturado na exceção!');
      console.log('📝 Detalhes:', err.message);
    }
  }
}

// Executar o teste
testError22023().then(() => {
  console.log('\n🏁 Teste concluído.');
  process.exit(0);
}).catch(err => {
  console.error('💥 Falha no teste:', err);
  process.exit(1);
});