require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTriggersDirectly() {
  console.log('🔧 Aplicando correções SQL diretamente via Edge Function...');
  
  try {
    // Usar a Edge Function fix-auth-direct-sql que já existe
    const { data, error } = await supabase.functions.invoke('fix-auth-direct-sql', {
      body: { action: 'apply_triggers' }
    });
    
    if (error) {
      console.log('❌ Erro ao aplicar correções:', error);
      return;
    }
    
    console.log('✅ Resultado da aplicação:', data);
    
    // Testar se agora funciona
    console.log('🧪 Testando criação de usuário após correção...');
    const testEmail = `test-fixed-${Date.now()}@example.com`;
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'SuperSecurePassword2024!@#$'
    });
    
    if (signupError) {
      console.log('❌ Erro no signup:', signupError);
      return;
    }
    
    console.log('✅ Usuário criado:', signupData.user?.id);
    
    // Aguardar um pouco para os triggers executarem
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar se o perfil foi criado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', signupData.user?.id)
      .single();
      
    if (profileError) {
      console.log('❌ Perfil ainda não foi criado automaticamente:', profileError);
    } else {
      console.log('🎉 SUCESSO! Perfil criado automaticamente:', profile);
    }
    
    // Verificar se a empresa foi criada
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', signupData.user?.id)
      .single();
      
    if (companyError) {
      console.log('❌ Empresa não foi criada automaticamente:', companyError);
    } else {
      console.log('🎉 SUCESSO! Empresa criada automaticamente:', company);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixTriggersDirectly();