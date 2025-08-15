import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Criar clientes Supabase
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabaseHealth() {
  console.log('🏥 VERIFICAÇÃO DE SAÚDE DO SUPABASE');
  console.log('=' .repeat(50));
  
  try {
    // Teste básico de conectividade
    console.log('⏳ Testando conectividade básica...');
    const { data, error } = await supabaseAnon.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erro na conectividade:', error.message);
      return false;
    }
    
    console.log('✅ Conectividade básica OK');
    return true;
    
  } catch (err) {
    console.log('💥 Exceção na conectividade:', err.message);
    return false;
  }
}

async function checkAuthSettings() {
  console.log('\n🔐 VERIFICAÇÃO DAS CONFIGURAÇÕES DE AUTH');
  console.log('=' .repeat(50));
  
  try {
    // Tentar obter configurações de Auth usando service role
    console.log('⏳ Verificando configurações de Auth...');
    
    // Teste 1: Verificar se conseguimos acessar auth.users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Erro ao acessar auth.users:', usersError.message);
      console.log('   Código:', usersError.code || 'N/A');
      console.log('   Detalhes:', usersError.details || 'N/A');
    } else {
      console.log('✅ Acesso a auth.users OK');
      console.log('   Usuários encontrados:', users?.length || 0);
    }
    
    // Teste 2: Verificar configurações via RPC
    console.log('\n⏳ Tentando verificar configurações via RPC...');
    const { data: config, error: configError } = await supabaseAdmin.rpc('get_auth_config');
    
    if (configError) {
      console.log('❌ Erro ao obter configurações (esperado se RPC não existir):', configError.message);
    } else {
      console.log('✅ Configurações obtidas:', config);
    }
    
  } catch (err) {
    console.log('💥 Exceção na verificação de Auth:', err.message);
  }
}

async function checkRLSPolicies() {
  console.log('\n🛡️ VERIFICAÇÃO DAS POLÍTICAS RLS');
  console.log('=' .repeat(50));
  
  try {
    // Verificar políticas RLS nas tabelas principais
    const tables = ['profiles', 'companies', 'surveys', 'responses'];
    
    for (const table of tables) {
      console.log(`\n⏳ Verificando RLS para tabela '${table}'...`);
      
      // Tentar acessar a tabela com anon key
      const { data, error } = await supabaseAnon
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Erro ao acessar '${table}':`, error.message);
        console.log('   Código:', error.code || 'N/A');
        
        if (error.code === 'PGRST116') {
          console.log('   💡 Possível causa: RLS habilitado sem políticas adequadas');
        }
      } else {
        console.log(`✅ Acesso a '${table}' OK`);
        console.log('   Registros encontrados:', data?.length || 0);
      }
    }
    
  } catch (err) {
    console.log('💥 Exceção na verificação de RLS:', err.message);
  }
}

async function checkUserLimits() {
  console.log('\n👥 VERIFICAÇÃO DE LIMITES DE USUÁRIOS');
  console.log('=' .repeat(50));
  
  try {
    // Contar usuários existentes
    console.log('⏳ Contando usuários existentes...');
    
    const { count, error } = await supabaseAdmin
      .from('auth.users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Erro ao contar usuários:', error.message);
    } else {
      console.log('✅ Total de usuários:', count || 0);
      
      if (count && count > 50000) {
        console.log('⚠️  ATENÇÃO: Muitos usuários - possível limite atingido');
      } else if (count && count > 10000) {
        console.log('⚠️  Número alto de usuários - verificar limites do plano');
      } else {
        console.log('✅ Número de usuários dentro do esperado');
      }
    }
    
  } catch (err) {
    console.log('💥 Exceção na verificação de limites:', err.message);
  }
}

async function testDirectUserCreation() {
  console.log('\n🧪 TESTE DE CRIAÇÃO DIRETA DE USUÁRIO (ADMIN API)');
  console.log('=' .repeat(50));
  
  const timestamp = Date.now();
  const testEmail = `admin-test-${timestamp}@example.com`;
  const testPassword = 'AdminTest123!';
  
  console.log(`📧 Email de teste: ${testEmail}`);
  
  try {
    console.log('⏳ Tentando criar usuário via Admin API...');
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (error) {
      console.log('❌ ERRO na criação via Admin API:');
      console.log('   Mensagem:', error.message);
      console.log('   Código:', error.status || 'N/A');
      console.log('   Tipo:', error.name || 'N/A');
      console.log('   Detalhes completos:', JSON.stringify(error, null, 2));
      return false;
    }
    
    console.log('✅ Usuário criado via Admin API com SUCESSO!');
    console.log('   User ID:', data.user?.id || 'N/A');
    console.log('   Email:', data.user?.email || 'N/A');
    
    // Tentar deletar o usuário de teste
    console.log('\n⏳ Limpando usuário de teste...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    
    if (deleteError) {
      console.log('⚠️  Erro ao deletar usuário de teste:', deleteError.message);
    } else {
      console.log('✅ Usuário de teste deletado com sucesso');
    }
    
    return true;
    
  } catch (err) {
    console.log('💥 EXCEÇÃO na criação via Admin API:');
    console.log('   Erro:', err.message);
    console.log('   Stack:', err.stack);
    return false;
  }
}

async function main() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DO SUPABASE');
  console.log('Data/Hora:', new Date().toLocaleString());
  console.log('\n');
  
  // Executar todas as verificações
  const healthOK = await checkSupabaseHealth();
  await checkAuthSettings();
  await checkRLSPolicies();
  await checkUserLimits();
  const adminCreateOK = await testDirectUserCreation();
  
  // Resumo final
  console.log('\n📊 RESUMO DO DIAGNÓSTICO:');
  console.log('=' .repeat(50));
  console.log(`Conectividade Básica: ${healthOK ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`Criação via Admin API: ${adminCreateOK ? '✅ OK' : '❌ FALHOU'}`);
  
  if (!healthOK) {
    console.log('\n🚨 PROBLEMA CRÍTICO: Conectividade básica falhou');
    console.log('Verifique se o projeto Supabase está ativo e as credenciais estão corretas.');
  } else if (!adminCreateOK) {
    console.log('\n🚨 PROBLEMA CRÍTICO: Admin API não consegue criar usuários');
    console.log('Isso indica um problema fundamental na configuração do Supabase Auth.');
    console.log('\n💡 RECOMENDAÇÕES:');
    console.log('1. Verificar logs detalhados no Dashboard do Supabase');
    console.log('2. Verificar se Auth está habilitado no painel');
    console.log('3. Verificar configurações de segurança e RLS');
    console.log('4. Considerar recriar o projeto Supabase');
  } else {
    console.log('\n✅ Admin API funciona - problema pode estar na configuração do Auth público');
    console.log('Verificar configurações de confirmação de email e políticas RLS.');
  }
  
  console.log('\n🏁 Diagnóstico concluído.');
}

// Executar o diagnóstico
main().catch(console.error);