import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🧪 TESTE ADMIN API - ISOLANDO TRIGGERS');
console.log('=====================================\n');

// Função para desabilitar triggers temporariamente
async function desabilitarTriggers() {
  console.log('🔧 Desabilitando triggers temporariamente...');
  
  try {
    // Usar SQL direto via query
    const { error: error1 } = await supabase
      .from('_temp')
      .select('*')
      .limit(0);
    
    // Tentar executar SQL via rpc se disponível
    const { error: error2 } = await supabase.rpc('exec', {
      sql: 'DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users; DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;'
    });
    
    console.log('ℹ️ Triggers desabilitados (se possível)');
    return true;
  } catch (err) {
    console.log('ℹ️ Não foi possível desabilitar triggers via script');
    return false;
  }
}

// Função para testar Admin API diretamente
async function testarAdminAPI() {
  console.log('🔑 Testando Admin API diretamente...');
  
  const testEmail = `admin-test-${Date.now()}@exemplo.com`;
  const testPassword = 'senha123456';
  
  console.log(`📧 Email de teste: ${testEmail}`);
  
  try {
    // Usar Admin API para criar usuário
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true // Confirmar email automaticamente
    });
    
    if (error) {
      console.log('❌ Erro no Admin API:', error.message);
      console.log('   Código:', error.status);
      console.log('   Tipo:', error.name);
      return false;
    }
    
    console.log('✅ Admin API funcionou!');
    console.log('   User ID:', data.user?.id);
    console.log('   Email:', data.user?.email);
    
    return { success: true, userId: data.user.id };
    
  } catch (err) {
    console.log('❌ Erro inesperado no Admin API:', err.message);
    return false;
  }
}

// Função para testar SignUp normal
async function testarSignUpNormal() {
  console.log('\n📝 Testando SignUp normal...');
  
  const testEmail = `signup-test-${Date.now()}@exemplo.com`;
  const testPassword = 'senha123456';
  
  console.log(`📧 Email de teste: ${testEmail}`);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.log('❌ Erro no SignUp:', error.message);
      console.log('   Código:', error.status);
      console.log('   Tipo:', error.name);
      return false;
    }
    
    console.log('✅ SignUp funcionou!');
    console.log('   User ID:', data.user?.id);
    
    return { success: true, userId: data.user.id };
    
  } catch (err) {
    console.log('❌ Erro inesperado no SignUp:', err.message);
    return false;
  }
}

// Função para verificar configurações do projeto
async function verificarConfiguracoes() {
  console.log('\n⚙️ Verificando configurações do projeto...');
  
  try {
    // Testar conectividade básica
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Erro de conectividade:', error.message);
      return false;
    }
    
    console.log('✅ Conectividade OK');
    
    // Verificar se Auth está habilitado
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('⚠️ Possível problema com Auth:', authError.message);
    } else {
      console.log('✅ Auth parece estar funcionando');
    }
    
    return true;
    
  } catch (err) {
    console.log('❌ Erro verificando configurações:', err.message);
    return false;
  }
}

// Função para criar profile manualmente
async function criarProfileManual(userId) {
  console.log('\n👤 Tentando criar profile manualmente...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: `manual-${Date.now()}@exemplo.com`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.log('❌ Erro criando profile manual:', error.message);
      return false;
    }
    
    console.log('✅ Profile criado manualmente!');
    console.log('   ID:', data.id);
    
    return true;
    
  } catch (err) {
    console.log('❌ Erro inesperado criando profile:', err.message);
    return false;
  }
}

// Executar todos os testes
async function executarTestes() {
  console.log('🚀 Iniciando testes diagnósticos...\n');
  
  // 1. Verificar configurações
  const configOK = await verificarConfiguracoes();
  
  // 2. Desabilitar triggers
  await desabilitarTriggers();
  
  // 3. Testar Admin API
  const adminResult = await testarAdminAPI();
  
  // 4. Testar SignUp normal
  const signupResult = await testarSignUpNormal();
  
  // 5. Se Admin API funcionou, testar criação manual de profile
  let manualProfileResult = false;
  if (adminResult && adminResult.userId) {
    manualProfileResult = await criarProfileManual(adminResult.userId);
  }
  
  // Relatório final
  console.log('\n📊 RELATÓRIO DIAGNÓSTICO');
  console.log('========================');
  console.log(`✅ Configurações: ${configOK ? 'OK' : 'PROBLEMA'}`);
  console.log(`✅ Admin API: ${adminResult ? 'FUNCIONOU' : 'FALHOU'}`);
  console.log(`✅ SignUp Normal: ${signupResult ? 'FUNCIONOU' : 'FALHOU'}`);
  console.log(`✅ Profile Manual: ${manualProfileResult ? 'FUNCIONOU' : 'FALHOU'}`);
  
  // Diagnóstico
  if (adminResult && signupResult) {
    console.log('\n🎉 SUCESSO! O problema foi resolvido!');
    console.log('   Tanto Admin API quanto SignUp estão funcionando.');
  } else if (adminResult && !signupResult) {
    console.log('\n⚠️ DIAGNÓSTICO: Problema nos triggers');
    console.log('   Admin API funciona, mas SignUp falha.');
    console.log('   Isso indica que os triggers estão causando o problema.');
  } else if (!adminResult && !signupResult) {
    console.log('\n❌ DIAGNÓSTICO: Problema fundamental no Auth');
    console.log('   Nem Admin API nem SignUp funcionam.');
    console.log('   Isso indica problema na configuração básica do Supabase Auth.');
  } else {
    console.log('\n🤔 DIAGNÓSTICO: Resultado inesperado');
    console.log('   Necessária investigação adicional.');
  }
  
  return {
    config: configOK,
    admin: !!adminResult,
    signup: !!signupResult,
    manual: manualProfileResult
  };
}

// Executar
executarTestes();