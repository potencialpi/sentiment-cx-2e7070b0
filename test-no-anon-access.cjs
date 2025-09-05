require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Cliente com service role (para setup)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cliente anônimo (deve falhar)
const supabaseAnon = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testNoAnonAccess() {
  console.log('🔒 Testando que acesso anônimo foi removido da tabela surveys...');
  
  try {
    // Teste 1: SELECT anônimo deve falhar
    console.log('\n📋 Teste 1: SELECT com chave anônima (deve falhar)...');
    const { data: anonSelect, error: anonSelectError } = await supabaseAnon
      .from('surveys')
      .select('id, title')
      .limit(1);
      
    if (anonSelectError) {
      console.log('✅ SELECT anônimo bloqueado corretamente:', anonSelectError.message);
    } else {
      console.log('❌ PROBLEMA: SELECT anônimo ainda funcionando!', anonSelect?.length || 0, 'registros');
    }
    
    // Teste 2: INSERT anônimo deve falhar
    console.log('\n📝 Teste 2: INSERT com chave anônima (deve falhar)...');
    const { data: anonInsert, error: anonInsertError } = await supabaseAnon
      .from('surveys')
      .insert({
        title: 'Test Survey Anônimo',
        description: 'Teste que deve falhar',
        user_id: '00000000-0000-0000-0000-000000000000'
      })
      .select();
      
    if (anonInsertError) {
      console.log('✅ INSERT anônimo bloqueado corretamente:', anonInsertError.message);
    } else {
      console.log('❌ PROBLEMA: INSERT anônimo ainda funcionando!', anonInsert);
      
      // Limpar se conseguiu inserir
      if (anonInsert && anonInsert[0]?.id) {
        await supabase.from('surveys').delete().eq('id', anonInsert[0].id);
        console.log('🧹 Registro de teste removido');
      }
    }
    
    // Teste 3: UPDATE anônimo deve falhar
    console.log('\n✏️ Teste 3: UPDATE com chave anônima (deve falhar)...');
    const { data: anonUpdate, error: anonUpdateError } = await supabaseAnon
      .from('surveys')
      .update({ title: 'Tentativa de Update Anônimo' })
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .select();
      
    if (anonUpdateError) {
      console.log('✅ UPDATE anônimo bloqueado corretamente:', anonUpdateError.message);
    } else {
      console.log('❌ PROBLEMA: UPDATE anônimo ainda funcionando!');
    }
    
    // Teste 4: Verificar que service role ainda funciona
    console.log('\n🔑 Teste 4: Verificando que service role ainda funciona...');
    const { data: serviceSelect, error: serviceSelectError } = await supabase
      .from('surveys')
      .select('id, title')
      .limit(1);
      
    if (serviceSelectError) {
      console.log('❌ PROBLEMA: Service role não está funcionando:', serviceSelectError.message);
    } else {
      console.log('✅ Service role funcionando corretamente:', serviceSelect?.length || 0, 'registros');
    }
    
    // Resumo dos testes
    console.log('\n📊 RESUMO DOS TESTES:');
    console.log('   - SELECT anônimo:', anonSelectError ? '🔒 BLOQUEADO' : '❌ PERMITIDO');
    console.log('   - INSERT anônimo:', anonInsertError ? '🔒 BLOQUEADO' : '❌ PERMITIDO');
    console.log('   - UPDATE anônimo:', anonUpdateError ? '🔒 BLOQUEADO' : '❌ PERMITIDO');
    console.log('   - Service role:', serviceSelectError ? '❌ FALHOU' : '✅ FUNCIONANDO');
    
    const allBlocked = anonSelectError && anonInsertError && anonUpdateError;
    const serviceWorking = !serviceSelectError;
    
    if (allBlocked && serviceWorking) {
      console.log('\n🎯 ✅ SUCESSO: Acesso anônimo removido completamente!');
      console.log('   - Usuários anônimos não podem mais acessar a tabela surveys');
      console.log('   - Service role continua funcionando para operações administrativas');
    } else {
      console.log('\n⚠️ ATENÇÃO: Ainda há problemas de segurança!');
      if (!allBlocked) {
        console.log('   - Acesso anônimo ainda não foi completamente bloqueado');
      }
      if (!serviceWorking) {
        console.log('   - Service role não está funcionando corretamente');
      }
    }
    
  } catch (error) {
    console.log('💥 Erro inesperado:', error);
  }
}

testNoAnonAccess().then(() => {
  console.log('\n✅ Teste de segurança concluído');
}).catch(console.error);