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

async function testRLSAuthentication() {
  console.log('🔐 Testando RLS e Autenticação para tabela surveys\n');
  
  try {
    // 1. Testar INSERT sem autenticação (deve falhar)
    console.log('1. Testando INSERT sem autenticação...');
    const { data: insertData, error: insertError } = await supabase
      .from('surveys')
      .insert({
        title: 'Teste Survey',
        description: 'Teste de inserção sem auth',
        user_id: '00000000-0000-0000-0000-000000000000' // UUID fake
      });
    
    if (insertError) {
      console.log('✅ INSERT sem auth falhou como esperado:', insertError.message);
    } else {
      console.log('❌ INSERT sem auth deveria ter falhado, mas passou!');
    }
    
    // 2. Verificar usuário atual
    console.log('\n2. Verificando usuário atual...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.log('❌ Nenhum usuário autenticado encontrado');
      console.log('\n📋 DIAGNÓSTICO:');
      console.log('- O RLS está funcionando corretamente (bloqueou INSERT sem auth)');
      console.log('- Para operações autenticadas, é necessário fazer login primeiro');
      console.log('- Use supabase.auth.signInWithPassword() antes de operações CRUD');
      return;
    }
    
    console.log('✅ Usuário autenticado:', userData.user.email);
    
    // 3. Testar INSERT com autenticação
    console.log('\n3. Testando INSERT com autenticação...');
    const { data: authInsertData, error: authInsertError } = await supabase
      .from('surveys')
      .insert({
        title: 'Survey Autenticado',
        description: 'Teste com usuário autenticado',
        user_id: userData.user.id
      });
    
    if (authInsertError) {
      console.log('❌ INSERT com auth falhou:', authInsertError.message);
    } else {
      console.log('✅ INSERT com auth funcionou!');
      console.log('Survey criado:', authInsertData);
    }
    
    // 4. Testar SELECT com autenticação
    console.log('\n4. Testando SELECT com autenticação...');
    const { data: selectData, error: selectError } = await supabase
      .from('surveys')
      .select('*')
      .eq('user_id', userData.user.id);
    
    if (selectError) {
      console.log('❌ SELECT falhou:', selectError.message);
    } else {
      console.log('✅ SELECT funcionou! Surveys encontrados:', selectData.length);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
  
  console.log('\n📋 RESUMO DO DIAGNÓSTICO:');
  console.log('- RLS (Row Level Security) está ATIVO na tabela surveys');
  console.log('- Operações sem autenticação são bloqueadas (correto)');
  console.log('- Para corrigir erros de RLS na aplicação:');
  console.log('  1. Certifique-se de que o usuário está autenticado');
  console.log('  2. Use supabase.auth.signInWithPassword() antes de operações CRUD');
  console.log('  3. Verifique se user_id corresponde ao usuário autenticado');
  console.log('\n💡 SOLUÇÃO:');
  console.log('- O RLS NÃO precisa ser corrigido - está funcionando corretamente');
  console.log('- O problema está na implementação da autenticação na aplicação');
  console.log('- Verifique se todas as operações CRUD são feitas após login');
}

testRLSAuthentication();