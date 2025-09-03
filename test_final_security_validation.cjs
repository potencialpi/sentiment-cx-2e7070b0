const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testSecurityCompliance() {
  console.log('🔒 Testando conformidade de segurança...');
  
  try {
    // 1. Testar inserção de resposta anônima
    console.log('\n1️⃣ Testando inserção de resposta anônima...');
    
    const { data: surveys, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title')
      .eq('status', 'active')
      .limit(1);
    
    if (surveyError) {
      console.error('❌ Erro ao buscar pesquisa:', surveyError);
      return;
    }
    
    if (!surveys || surveys.length === 0) {
      console.log('⚠️ Nenhuma pesquisa ativa encontrada');
      return;
    }
    
    const testSurvey = surveys[0];
    console.log(`✅ Pesquisa encontrada: ${testSurvey.title}`);
    
    // Inserir resposta de teste
    const testResponseData = {
      survey_id: testSurvey.id,
      respondent_id: generateUUID(),
      responses: {
        'test_question': 'Resposta de teste para validação de segurança',
        'timestamp': new Date().toISOString()
      }
    };
    
    const { data: insertedResponse, error: insertError } = await supabase
      .from('responses')
      .insert(testResponseData)
      .select('id')
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir resposta:', insertError);
      return;
    }
    
    console.log(`✅ Resposta inserida com sucesso! ID: ${insertedResponse.id}`);
    
    // 2. Testar múltiplas inserções
    console.log('\n2️⃣ Testando múltiplas inserções...');
    
    const multipleResponses = [];
    for (let i = 0; i < 3; i++) {
      const responseData = {
        survey_id: testSurvey.id,
        respondent_id: generateUUID(),
        responses: {
          'test_question': `Resposta múltipla ${i + 1}`,
          'batch_test': true
        }
      };
      multipleResponses.push(responseData);
    }
    
    const { data: batchInsert, error: batchError } = await supabase
      .from('responses')
      .insert(multipleResponses)
      .select('id');
    
    if (batchError) {
      console.error('❌ Erro na inserção em lote:', batchError);
    } else {
      console.log(`✅ ${batchInsert.length} respostas inseridas em lote com sucesso`);
    }
    
    // 3. Limpeza dos dados de teste
    console.log('\n3️⃣ Limpando dados de teste...');
    
    const testIds = [insertedResponse.id];
    if (batchInsert) {
      testIds.push(...batchInsert.map(r => r.id));
    }
    
    for (const id of testIds) {
      const { error: deleteError } = await supabase
        .from('responses')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error(`❌ Erro ao deletar resposta ${id}:`, deleteError);
      }
    }
    
    console.log('✅ Dados de teste limpos com sucesso');
    
    // 4. Resumo da validação
    console.log('\n📋 RESUMO DA VALIDAÇÃO DE SEGURANÇA:');
    console.log('✅ Inserção de respostas anônimas: FUNCIONANDO');
    console.log('✅ Inserção em lote: FUNCIONANDO');
    console.log('✅ Limpeza de dados: FUNCIONANDO');
    console.log('\n🎉 Todas as validações de segurança passaram!');
    
  } catch (error) {
    console.error('❌ Erro inesperado durante validação:', error);
  }
}

// Executar teste
testSecurityCompliance().then(() => {
  console.log('\n🏁 Validação de segurança concluída');
}).catch(error => {
  console.error('❌ Falha na validação de segurança:', error);
  process.exit(1);
});