const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

// Cliente com chave anônima (como o frontend)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Cliente com service role (admin)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testSurveysAccess() {
  console.log('🔍 Testando acesso à tabela surveys...');
  
  try {
    // Teste 1: Tentar acessar surveys com cliente anônimo
    console.log('\n1️⃣ Testando acesso anônimo à tabela surveys:');
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('surveys')
      .select('id, title, status')
      .limit(5);
    
    if (anonError) {
      console.error('❌ Erro com cliente anônimo:', anonError);
    } else {
      console.log('✅ Cliente anônimo conseguiu acessar:', anonData?.length || 0, 'surveys');
    }

    // Teste 2: Tentar acessar surveys com service role
    console.log('\n2️⃣ Testando acesso admin à tabela surveys:');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('surveys')
      .select('id, title, status, user_id')
      .limit(5);
    
    if (adminError) {
      console.error('❌ Erro com service role:', adminError);
    } else {
      console.log('✅ Service role conseguiu acessar:', adminData?.length || 0, 'surveys');
      if (adminData && adminData.length > 0) {
        console.log('📋 Exemplo de survey:', {
          id: adminData[0].id,
          title: adminData[0].title,
          status: adminData[0].status,
          user_id: adminData[0].user_id
        });
      }
    }

    // Teste 3: Tentar inserir um survey com cliente anônimo
    console.log('\n3️⃣ Testando inserção com cliente anônimo:');
    const { data: insertData, error: insertError } = await supabaseAnon
      .from('surveys')
      .insert({
        title: 'Teste Survey',
        description: 'Survey de teste',
        status: 'draft',
        user_id: '00000000-0000-0000-0000-000000000000' // UUID fictício
      })
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir com cliente anônimo:', insertError);
    } else {
      console.log('✅ Cliente anônimo conseguiu inserir:', insertData);
      
      // Limpar o teste
      if (insertData && insertData[0]) {
        await supabaseAdmin
          .from('surveys')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Survey de teste removido');
      }
    }

    // Teste 4: Verificar se existe algum usuário autenticado
    console.log('\n4️⃣ Verificando usuários no sistema:');
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .limit(3);
    
    if (usersError) {
      console.error('❌ Erro ao verificar usuários:', usersError);
    } else {
      console.log('👥 Usuários encontrados:', usersData?.length || 0);
      if (usersData && usersData.length > 0) {
        console.log('📋 Exemplo de usuário:', {
          user_id: usersData[0].user_id,
          email: usersData[0].email
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testSurveysAccess();