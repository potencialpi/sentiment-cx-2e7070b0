const { createClient } = require('@supabase/supabase-js');

// Verificação de variáveis de ambiente
if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  console.error('❌ SUPABASE_URL não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_URL');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}


// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Estruturas esperadas das tabelas
const expectedStructures = {
  profiles: [
    'id', 'user_id', 'plan_name', 'status', 'created_at', 'updated_at'
  ],
  companies: [
    'id', 'user_id', 'company_name', 'plan_name', 'created_at', 'updated_at'
  ],
  surveys: [
    'id', 'user_id', 'title', 'description', 'unique_link', 'max_responses', 
    'current_responses', 'status', 'created_at', 'updated_at'
  ],
  questions: [
    'id', 'survey_id', 'question_text', 'question_type', 'question_order', 
    'options', 'created_at', 'updated_at'
  ],
  responses: [
    'id', 'survey_id', 'respondent_id', 'responses', 'sentiment_score', 
    'sentiment_category', 'created_at'
  ],
  question_responses: [
    'id', 'response_id', 'question_id', 'answer_text', 'answer_rating', 
    'answer_choices', 'sentiment_score', 'sentiment_label', 'created_at'
  ],
  respondents: [
    'id', 'user_id', 'name', 'email', 'created_at', 'updated_at'
  ]
};

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura detalhada das tabelas...');
  console.log('=' .repeat(70));
  
  for (const [tableName, expectedColumns] of Object.entries(expectedStructures)) {
    console.log(`\n📋 Verificando tabela: ${tableName.toUpperCase()}`);
    console.log('-' .repeat(50));
    
    try {
      // Tentar fazer uma consulta para obter a estrutura
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Erro ao acessar tabela ${tableName}:`, error.message);
        
        // Verificar se é erro de RLS ou tabela não existe
        if (error.message.includes('row-level security')) {
          console.log('   ℹ️  Tabela existe mas está protegida por RLS');
        } else if (error.message.includes('does not exist')) {
          console.log('   ❌ TABELA NÃO EXISTE!');
        }
        continue;
      }
      
      console.log(`✅ Tabela ${tableName} acessível`);
      
      if (data && data.length > 0) {
        const actualColumns = Object.keys(data[0]);
        console.log('   Colunas encontradas:', actualColumns.join(', '));
        
        // Verificar colunas faltantes
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        if (missingColumns.length > 0) {
          console.log('   ⚠️  Colunas faltantes:', missingColumns.join(', '));
        }
        
        // Verificar colunas extras
        const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
        if (extraColumns.length > 0) {
          console.log('   ℹ️  Colunas extras:', extraColumns.join(', '));
        }
        
        if (missingColumns.length === 0 && extraColumns.length === 0) {
          console.log('   ✅ Estrutura da tabela está correta!');
        }
      } else {
        console.log('   ℹ️  Tabela vazia, não é possível verificar estrutura completa');
        
        // Tentar inserir um registro de teste para verificar estrutura
        console.log('   🧪 Tentando verificar estrutura com insert de teste...');
        
        let testData = {};
        expectedColumns.forEach(col => {
          if (col === 'id') testData[col] = '00000000-0000-0000-0000-000000000000';
          else if (col.includes('_id')) testData[col] = '00000000-0000-0000-0000-000000000000';
          else if (col.includes('_at')) testData[col] = new Date().toISOString();
          else if (typeof col === 'string') testData[col] = 'test';
          else testData[col] = 0;
        });
        
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(testData);
        
        if (insertError) {
          if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
            const match = insertError.message.match(/column "([^"]+)" of relation "[^"]+" does not exist/);
            if (match) {
              console.log(`   ❌ Coluna '${match[1]}' não existe na tabela ${tableName}`);
            }
          } else if (insertError.message.includes('row-level security')) {
            console.log('   ℹ️  Insert bloqueado por RLS (esperado)');
          } else {
            console.log('   ⚠️  Erro no insert de teste:', insertError.message);
          }
        } else {
          console.log('   ✅ Insert de teste bem-sucedido (estrutura OK)');
          // Limpar o registro de teste
          await supabase.from(tableName).delete().eq('id', testData.id);
        }
      }
      
    } catch (error) {
      console.log(`❌ Erro inesperado na tabela ${tableName}:`, error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('🎯 VERIFICAÇÃO COMPLETA!');
  console.log('- Verifique os erros acima para identificar problemas');
  console.log('- Colunas faltantes precisam ser adicionadas via migração');
  console.log('- Erros de RLS são normais para tabelas protegidas');
  console.log('=' .repeat(70));
}

// Executar verificação
checkTableStructure();