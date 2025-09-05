require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSurveysRLS() {
  console.log('🔍 Analisando erro 42501 - Permission denied for table surveys');
  console.log('\n📋 Testando diferentes tipos de acesso à tabela surveys...');
  
  try {
    // Teste 1: Acesso com chave anônima
    console.log('\n🔑 Teste 1: Acesso com chave anônima...');
    const supabaseAnon = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('surveys')
      .select('id, title')
      .limit(1);
      
    if (anonError) {
      console.log('❌ Erro com chave anônima:', anonError);
    } else {
      console.log('✅ Acesso anônimo funcionando:', anonData?.length || 0, 'registros');
    }
    
    // Teste 2: Acesso com service role
    console.log('\n🔑 Teste 2: Acesso com service role...');
    const { data: serviceData, error: serviceError } = await supabase
      .from('surveys')
      .select('id, title')
      .limit(1);
      
    if (serviceError) {
      console.log('❌ Erro com service role:', serviceError);
    } else {
      console.log('✅ Acesso service role funcionando:', serviceData?.length || 0, 'registros');
    }
    
    // Teste 3: Tentar operação de UPDATE (que está falhando)
    console.log('\n📝 Teste 3: Tentando operação UPDATE...');
    const { data: updateData, error: updateError } = await supabase
      .from('surveys')
      .update({ title: 'Test Update' })
      .eq('id', '00000000-0000-0000-0000-000000000000') // ID inexistente para não afetar dados
      .select();
      
    if (updateError) {
      console.log('❌ Erro na operação UPDATE:', updateError);
      console.log('\n🔍 DIAGNÓSTICO DO ERRO 42501:');
      
      if (updateError.code === '42501') {
        console.log('\n📋 Possíveis causas do erro "permission denied for table surveys":');
        console.log('\n1. 🔒 RLS (Row Level Security) habilitado sem políticas adequadas');
        console.log('   - A tabela tem RLS ativo mas não há políticas que permitam UPDATE');
        console.log('   - Ou as políticas existentes são muito restritivas');
        console.log('\n2. 👤 Problema de autenticação/autorização');
        console.log('   - Usuário não está autenticado corretamente');
        console.log('   - Token JWT inválido ou expirado');
        console.log('   - Usuário não tem as permissões necessárias');
        console.log('\n3. 🔧 Configuração de políticas RLS');
        console.log('   - Políticas podem estar bloqueando operações UPDATE');
        console.log('   - Condições das políticas não são atendidas pelo contexto atual');
        console.log('\n4. 🎯 Contexto de execução');
        console.log('   - Operação sendo executada em contexto inadequado (frontend vs backend)');
        console.log('   - Falta de claims JWT necessários para as políticas');
      }
    } else {
      console.log('✅ Operação UPDATE funcionando (nenhum registro afetado como esperado)');
    }
    
    // Testar acesso direto à tabela
    console.log('\n🧪 Testando acesso direto à tabela surveys...');
    const { data: testAccess, error: accessError } = await supabase
      .from('surveys')
      .select('id, title')
      .limit(1);
      
    if (accessError) {
      console.log('❌ Erro no acesso direto:', accessError);
      console.log('\n🔍 DIAGNÓSTICO:');
      console.log('- Código 42501 indica que o usuário não tem permissão para acessar a tabela');
      console.log('- Isso pode ser causado por:');
      console.log('  1. RLS habilitado sem políticas adequadas');
      console.log('  2. Políticas RLS muito restritivas');
      console.log('  3. Usuário não autenticado ou com role inadequado');
      console.log('  4. Falta de permissões básicas na tabela');
    } else {
      console.log('✅ Acesso direto funcionando:', testAccess?.length || 0, 'registros encontrados');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkSurveysRLS();