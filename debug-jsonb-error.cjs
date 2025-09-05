const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugJsonbError() {
  console.log('🔍 Investigando erro JSONB 22023...');
  
  try {
    // Teste 1: Verificar estrutura da tabela responses
    console.log('\n1. Verificando estrutura da tabela responses...');
    
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id')
      .limit(1);
    
    if (surveys && surveys.length > 0) {
      const surveyId = surveys[0].id;
      
      // Tentar inserir uma response com a estrutura correta
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert({
          survey_id: surveyId,
          responses: [{"question_1": "Esta é uma resposta de teste muito longa para disparar a análise de sentimento e verificar se o erro 22023 ocorre no trigger"}]
        })
        .select();
      
      if (responseError) {
        console.log('❌ Erro ao inserir response:', responseError.message);
        console.log('Código:', responseError.code);
        if (responseError.code === '22023') {
          console.log('🎯 ENCONTRADO! O erro 22023 está no trigger de inserção de responses');
          console.log('Detalhes completos:', JSON.stringify(responseError, null, 2));
          
          // Este é provavelmente o trigger de análise de sentimento
          console.log('\n💡 Possível causa: Trigger de análise de sentimento tentando acessar configurações inexistentes');
          console.log('   - current_setting(\'app.supabase_url\')');
          console.log('   - current_setting(\'app.supabase_service_role_key\')');
        }
      } else {
        console.log('✅ Response inserida com sucesso:', response?.[0]?.id);
        
        // Limpar o registro de teste
        if (response?.[0]?.id) {
          await supabase.from('responses').delete().eq('id', response[0].id);
          console.log('🧹 Registro de teste removido');
        }
      }
    }
    
    // Teste 2: Tentar inserir uma response com texto curto (não deve disparar análise)
    console.log('\n2. Testando response com texto curto...');
    
    if (surveys && surveys.length > 0) {
      const surveyId = surveys[0].id;
      
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert({
          survey_id: surveyId,
          responses: [{"question_1": "Sim"}] // Resposta curta
        })
        .select();
      
      if (responseError) {
        console.log('❌ Erro ao inserir response curta:', responseError.message);
        console.log('Código:', responseError.code);
      } else {
        console.log('✅ Response curta inserida com sucesso:', response?.[0]?.id);
        
        // Limpar o registro de teste
        if (response?.[0]?.id) {
          await supabase.from('responses').delete().eq('id', response[0].id);
          console.log('🧹 Registro de teste removido');
        }
      }
    }
    
    // Teste 3: Verificar se o trigger de análise de sentimento existe
    console.log('\n3. Verificando triggers na tabela responses...');
    
    // Como não podemos usar SQL diretamente, vamos tentar uma abordagem diferente
    console.log('   Triggers ativos podem incluir:');
    console.log('   - sentiment_analysis_trigger (análise de sentimento)');
    console.log('   - audit_responses_trigger (auditoria)');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.code === '22023') {
      console.log('🎯 ENCONTRADO! O erro 22023 está ocorrendo no nível geral');
      console.log('Detalhes completos:', JSON.stringify(error, null, 2));
    }
  }
  
  console.log('\n🔧 Possíveis soluções para o erro 22023:');
  console.log('1. Desabilitar o trigger de análise de sentimento temporariamente');
  console.log('2. Configurar as variáveis app.supabase_url e app.supabase_service_role_key');
  console.log('3. Modificar o trigger para lidar com configurações ausentes');
}

debugJsonbError().catch(console.error);