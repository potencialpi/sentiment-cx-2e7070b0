const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMagicLinksSchema() {
  console.log('🔍 Verificando estrutura da tabela magic_links...');
  
  try {
    // Verificar estrutura da tabela
    const { data: columns, error: schemaError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'magic_links' 
          AND table_schema = 'public' 
          ORDER BY ordinal_position;
        `
      });
    
    if (schemaError) {
      console.error('❌ Erro ao verificar esquema:', schemaError.message);
      
      // Tentar método alternativo - buscar dados da tabela
      console.log('\n🔄 Tentando método alternativo...');
      const { data: sampleData, error: sampleError } = await supabase
        .from('magic_links')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('❌ Erro ao buscar dados de exemplo:', sampleError.message);
        return;
      }
      
      if (sampleData && sampleData.length > 0) {
        console.log('✅ Estrutura inferida dos dados:');
        console.log('Colunas encontradas:', Object.keys(sampleData[0]));
        console.log('Dados de exemplo:', sampleData[0]);
      } else {
        console.log('⚠️ Tabela vazia, não é possível inferir estrutura');
      }
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Estrutura da tabela magic_links:');
      columns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('⚠️ Nenhuma coluna encontrada');
    }
    
    // Verificar dados existentes
    console.log('\n🔍 Verificando dados existentes...');
    const { data: existingData, error: dataError } = await supabase
      .from('magic_links')
      .select('*')
      .limit(5);
    
    if (dataError) {
      console.error('❌ Erro ao buscar dados:', dataError.message);
      return;
    }
    
    if (existingData && existingData.length > 0) {
      console.log(`✅ ${existingData.length} registros encontrados`);
      console.log('Exemplo de registro:', existingData[0]);
    } else {
      console.log('⚠️ Nenhum registro encontrado na tabela');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

checkMagicLinksSchema();