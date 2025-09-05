require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Verificando tabelas existentes...');
  
  // Tentar acessar algumas tabelas conhecidas
  const tablesToCheck = ['surveys', 'profiles', 'companies', 'sentiment_analysis', 'survey_questions', 'survey_responses'];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: existe (${data?.length || 0} registros encontrados)`);
        if (data?.[0]) {
          console.log(`   Colunas: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
}

checkTables();