require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSchema() {
  console.log('🔍 Verificando schema das tabelas...');
  
  try {
    // Verificar estrutura da tabela surveys
    console.log('\n📋 Estrutura da tabela surveys:');
    const { data: surveysColumns, error: surveysError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'surveys'
          ORDER BY ordinal_position;
        `
      });
    
    if (surveysError) {
      console.error('❌ Erro ao verificar surveys (exec_sql não existe):', surveysError.message);
      
      // Tentar SELECT direto
      console.log('🔄 Tentando SELECT direto na tabela surveys...');
      const { data: surveysData, error: surveysSelectError } = await supabase
        .from('surveys')
        .select('*')
        .limit(1);
      
      if (surveysSelectError) {
        console.error('❌ Erro no SELECT surveys:', surveysSelectError.message);
      } else {
        console.log('✅ Exemplo de registro surveys:', surveysData?.[0] || 'Nenhum registro');
        if (surveysData?.[0]) {
          console.log('📋 Colunas disponíveis:', Object.keys(surveysData[0]));
        }
      }
    } else {
      console.log('✅ Colunas da tabela surveys:', surveysColumns);
    }

    // Verificar estrutura da tabela responses
    console.log('\n📋 Estrutura da tabela responses:');
    const { data: responsesColumns, error: responsesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'responses'
          ORDER BY ordinal_position;
        `
      });
    
    if (responsesError) {
      console.error('❌ Erro ao verificar responses (exec_sql não existe):', responsesError.message);
      
      // Tentar SELECT direto
      console.log('🔄 Tentando SELECT direto na tabela responses...');
      const { data: responsesData, error: responsesSelectError } = await supabase
        .from('responses')
        .select('*')
        .limit(1);
      
      if (responsesSelectError) {
        console.error('❌ Erro no SELECT responses:', responsesSelectError.message);
      } else {
        console.log('✅ Exemplo de registro responses:', responsesData?.[0] || 'Nenhum registro');
        if (responsesData?.[0]) {
          console.log('📋 Colunas disponíveis:', Object.keys(responsesData[0]));
        }
      }
    } else {
      console.log('✅ Colunas da tabela responses:', responsesColumns);
    }

    // Verificar tabela profiles
    console.log('\n📋 Estrutura da tabela profiles:');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Erro no SELECT profiles:', profilesError.message);
    } else {
      console.log('✅ Exemplo de registro profiles:', profilesData?.[0] || 'Nenhum registro');
      if (profilesData?.[0]) {
        console.log('📋 Colunas disponíveis:', Object.keys(profilesData[0]));
      }
    }

    // Verificar políticas RLS usando método direto
    console.log('\n🔒 Verificando políticas RLS:');
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname, tablename, rowsecurity
          FROM pg_tables 
          WHERE schemaname = 'public' AND tablename IN ('surveys', 'responses', 'profiles');
        `
      });
    
    if (rlsError) {
      console.error('❌ Erro ao verificar RLS:', rlsError.message);
    } else {
      console.log('✅ Status RLS das tabelas:', rlsCheck);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

async function main() {
  console.log('🚀 Iniciando verificação de schema...');
  await checkSchema();
  console.log('\n✅ Verificação concluída!');
}

main().catch(console.error);