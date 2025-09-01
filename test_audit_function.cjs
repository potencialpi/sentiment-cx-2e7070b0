const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configurações do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuditFunction() {
  console.log('🔍 TESTANDO FUNÇÃO RPC log_audit_action\n');
  
  try {
    // Testar se a função RPC existe
    const { data, error } = await supabase.rpc('log_audit_action', {
      p_action: 'TEST_ACTION',
      p_table_name: 'test_table',
      p_record_id: null, // UUID válido ou null
      p_details: { test: true },
      p_ip_address: '127.0.0.1',
      p_user_agent: 'test-agent'
    });
    
    if (error) {
      console.log('❌ FUNÇÃO log_audit_action NÃO EXISTE OU TEM ERRO');
      console.log('Erro:', error.message);
      console.log('\n🔧 SOLUÇÃO: A função RPC precisa ser criada no banco de dados');
      return false;
    } else {
      console.log('✅ FUNÇÃO log_audit_action EXISTE E FUNCIONA');
      console.log('Resultado:', data);
      return true;
    }
  } catch (err) {
    console.log('❌ ERRO AO TESTAR FUNÇÃO:', err.message);
    return false;
  }
}

// Executar teste
testAuditFunction().then(success => {
  if (success) {
    console.log('\n✅ Função log_audit_action está funcionando!');
  } else {
    console.log('\n❌ Função log_audit_action precisa ser criada.');
  }
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('❌ Erro inesperado:', err);
  process.exit(1);
});