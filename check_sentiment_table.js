// Verificar se a tabela sentiment_analysis existe
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSentimentTable() {
  console.log('🔍 Verificando tabela sentiment_analysis...');
  
  try {
    // Tentar fazer uma consulta simples na tabela
    const { data, error } = await supabase
      .from('sentiment_analysis')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao acessar tabela sentiment_analysis:', error.message);
      console.log('Código do erro:', error.code);
      console.log('Detalhes:', error.details);
      
      // Se a tabela não existir, vamos verificar outras tabelas
      console.log('\n🔍 Verificando outras tabelas disponíveis...');
      
      const tables = ['responses', 'question_responses', 'surveys', 'profiles'];
      
      for (const table of tables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (tableError) {
            console.log(`❌ ${table}: ${tableError.message}`);
          } else {
            console.log(`✅ ${table}: Tabela existe e acessível`);
          }
        } catch (e) {
          console.log(`❌ ${table}: ${e.message}`);
        }
      }
    } else {
      console.log('✅ Tabela sentiment_analysis existe e está acessível!');
      console.log('Número de registros encontrados:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Estrutura do primeiro registro:', Object.keys(data[0]));
      }
    }
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar verificação
checkSentimentTable();