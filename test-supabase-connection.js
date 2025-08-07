// Script para testar a conexão com o Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mjuxvppexydaeuoernxa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔗 Testando conexão com o Supabase...');
  console.log('URL:', SUPABASE_URL);
  
  try {
    // Teste 1: Verificar se a API está respondendo
    console.log('\n1. Testando API básica...');
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Erro na API:', error.message);
    } else {
      console.log('✅ API funcionando! Registros na tabela profiles:', data?.length || 'N/A');
    }
    
    // Teste 2: Verificar autenticação
    console.log('\n2. Testando autenticação...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ Erro de autenticação:', authError.message);
    } else {
      console.log('✅ Sistema de autenticação funcionando');
      console.log('Sessão ativa:', session ? 'Sim' : 'Não');
    }
    
    // Teste 3: Verificar tabelas principais
    console.log('\n3. Testando acesso às tabelas...');
    const tables = ['profiles', 'companies', 'surveys'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('*').limit(1);
        if (tableError) {
          console.log(`❌ Erro na tabela ${table}:`, tableError.message);
        } else {
          console.log(`✅ Tabela ${table} acessível`);
        }
      } catch (err) {
        console.log(`❌ Erro ao acessar tabela ${table}:`, err.message);
      }
    }
    
    console.log('\n🎉 Teste de conexão concluído!');
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

testConnection();