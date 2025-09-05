// Testar acesso com service role key
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com service role key
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
// Chave real do service role
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testServiceRoleAccess() {
  console.log('🔍 Testando acesso com service role key...');
  
  try {
    // Tentar acessar a tabela sentiment_analysis
    const { data, error } = await supabase
      .from('sentiment_analysis')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao acessar sentiment_analysis:', error.message);
      console.log('Código:', error.code);
    } else {
      console.log('✅ Acesso à tabela sentiment_analysis funcionou!');
      console.log('Registros encontrados:', data?.length || 0);
    }
    
    // Tentar inserir um registro de teste
    const testData = {
      response_id: '00000000-0000-0000-0000-000000000000',
      survey_id: '00000000-0000-0000-0000-000000000000', 
      user_id: '00000000-0000-0000-0000-000000000000',
      sentiment_results: [{ label: 'positive', score: 0.8, confidence: 0.9 }],
      summary_stats: { positive: 1, neutral: 0, negative: 0 }
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('sentiment_analysis')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir teste:', insertError.message);
    } else {
      console.log('✅ Inserção de teste funcionou!');
      console.log('ID inserido:', insertData[0]?.id);
      
      // Limpar o registro de teste
      await supabase
        .from('sentiment_analysis')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Registro de teste removido');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar teste
testServiceRoleAccess();