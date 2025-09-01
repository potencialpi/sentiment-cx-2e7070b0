const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configurações do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('SUPABASE_URL:', SUPABASE_URL ? 'OK' : 'MISSING');
  console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'OK' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMagicLinksTable() {
  console.log('🔍 TESTANDO TABELA MAGIC_LINKS\n');
  
  try {
    // Testar se a tabela existe
    const { data, error } = await supabase
      .from('magic_links')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ TABELA MAGIC_LINKS NÃO EXISTE');
      console.log('Erro:', error.message);
      console.log('\n🔧 SOLUÇÃO: Execute o script SQL fix-magic-links-table.sql no Dashboard do Supabase');
      return false;
    } else {
      console.log('✅ TABELA MAGIC_LINKS EXISTE');
      console.log('Registros:', data || 0);
      return true;
    }
  } catch (err) {
    console.log('❌ ERRO AO TESTAR TABELA:', err.message);
    return false;
  }
}

// Executar teste
testMagicLinksTable().then(success => {
  if (success) {
    console.log('\n✅ Tabela magic_links está funcionando corretamente!');
  } else {
    console.log('\n❌ Tabela magic_links precisa ser criada.');
  }
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('❌ Erro inesperado:', err);
  process.exit(1);
});