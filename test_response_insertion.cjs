const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

// Cliente Supabase com anon key (como usado no frontend)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testResponseInsertion() {
  console.log('🧪 Testando inserção de resposta como usuário anônimo...');
  
  try {
    // Primeiro, vamos buscar uma pesquisa ativa para testar
    const { data: surveys, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title, status, current_responses, max_responses')
      .eq('status', 'active')
      .limit(1);
    
    if (surveyError) {
      console.error('❌ Erro ao buscar pesquisa:', surveyError);
      return;
    }
    
    if (!surveys || surveys.length === 0) {
      console.log('⚠️ Nenhuma pesquisa ativa encontrada para teste');
      return;
    }
    
    const testSurvey = surveys[0];
    console.log('✅ Pesquisa encontrada:', testSurvey.title);
    
    // Gerar dados de teste para a resposta
    const testResponseData = {
      survey_id: testSurvey.id,
      responses: {
        'test_question_1': 'Resposta de teste',
        'test_question_2': ['Opção 1', 'Opção 2']
      },
      respondent_id: crypto.randomUUID()
    };
    
    console.log('📝 Tentando inserir resposta de teste...');
    
    // Tentar inserir a resposta
    const { data: responseRecord, error: responseError } = await supabase
      .from('responses')
      .insert(testResponseData)
      .select('id')
      .single();
    
    if (responseError) {
      console.error('❌ Erro ao inserir resposta:', responseError);
      
      // Verificar se é erro de RLS
      if (responseError.code === '42501' || 
          responseError.message.includes('row-level security') ||
          responseError.message.includes('permission denied')) {
        console.log('🔒 Erro de RLS detectado!');
        console.log('Código:', responseError.code);
        console.log('Mensagem:', responseError.message);
        console.log('Detalhes:', responseError.details);
        console.log('Dica:', responseError.hint);
      }
      
      return;
    }
    
    console.log('✅ Resposta inserida com sucesso!');
    console.log('ID da resposta:', responseRecord.id);
    
    // Limpar dados de teste
    console.log('🧹 Limpando dados de teste...');
    const { error: deleteError } = await supabase
      .from('responses')
      .delete()
      .eq('id', responseRecord.id);
    
    if (deleteError) {
      console.log('⚠️ Aviso: Não foi possível limpar dados de teste:', deleteError.message);
    } else {
      console.log('✅ Dados de teste limpos com sucesso');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar o teste
testResponseInsertion().then(() => {
  console.log('🏁 Teste concluído');
}).catch(error => {
  console.error('💥 Falha no teste:', error);
});