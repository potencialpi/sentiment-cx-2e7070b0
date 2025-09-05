// Teste direto da Edge Function analyze-sentiment
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, anonKey);

async function testEdgeFunction() {
  console.log('🧪 Testando Edge Function analyze-sentiment diretamente...');
  
  try {
    // Primeiro, vamos criar um response_id válido
    console.log('📝 Criando response de teste...');
    
    const { data: responseData, error: responseError } = await supabase
      .from('responses')
      .insert({
        survey_id: 'd813cf8d-c1bf-41a3-a425-60bb80a9d947', // Survey ID real obtido do banco
        respondent_id: crypto.randomUUID(),
        responses: { test: 'response data' }
      })
      .select()
      .single();
    
    if (responseError) {
      console.error('❌ Erro ao criar response:', responseError.message);
      return;
    }
    
    console.log('✅ Response criado:', responseData.id);
    
    // Agora testar a Edge Function
    const testData = {
      responseId: responseData.id,
      texts: [
        'Este produto é excelente! Estou muito satisfeito.',
        'Não gostei nada, muito ruim e caro.'
      ]
    };
    
    console.log('🔍 Chamando Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('analyze-sentiment', {
      body: testData
    });
    
    if (error) {
      console.error('❌ Erro na Edge Function:', error);
      console.error('Detalhes:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Sucesso!');
      console.log('Resultado:', JSON.stringify(data, null, 2));
    }
    
    // Limpar o response de teste
    await supabase
      .from('responses')
      .delete()
      .eq('id', responseData.id);
    
    console.log('🧹 Response de teste removido');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar teste
testEdgeFunction();