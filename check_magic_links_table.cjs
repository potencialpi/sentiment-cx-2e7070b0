require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMagicLinksTable() {
  console.log('🔍 VERIFICANDO TABELA magic_links\n');
  
  try {
    // Tentar acessar a tabela magic_links
    const { data, error } = await supabase
      .from('magic_links')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ ERRO ao acessar tabela magic_links:', error.message);
      console.error('Código:', error.code);
      console.error('Detalhes:', error.details);
      
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('\n📋 A tabela magic_links NÃO EXISTE.');
        console.log('\n🔧 SOLUÇÃO:');
        console.log('1. Acesse o Dashboard do Supabase');
        console.log('2. Vá para SQL Editor');
        console.log('3. Execute o arquivo: supabase/migrations/20250101000000_create_magic_links_system.sql');
        console.log('4. Ou aplique manualmente a migração com: supabase db push');
      }
      return;
    }
    
    console.log('✅ TABELA magic_links EXISTE e está acessível');
    console.log('Registros encontrados:', data ? data.length : 0);
    
    // Verificar estrutura da tabela
    console.log('\n🔍 Verificando estrutura da tabela...');
    
    const { data: tableInfo, error: infoError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'magic_links' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (infoError) {
      console.log('⚠️  Não foi possível verificar a estrutura da tabela');
    } else {
      console.log('📋 Estrutura da tabela magic_links:');
      tableInfo.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error.message);
  }
}

// Executar verificação
checkMagicLinksTable()
  .then(() => {
    console.log('\n✅ Verificação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro na verificação:', error);
    process.exit(1);
  });