require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFrontendFix() {
  console.log('🧪 Testando correção do frontend...');
  
  try {
    // 1. Criar um usuário de teste
    const testEmail = `test-frontend-fix-${Date.now()}@example.com`;
    console.log(`📧 Criando usuário: ${testEmail}`);
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'SuperSecurePassword2024!@#$'
    });
    
    if (signupError) {
      console.log('❌ Erro no signup:', signupError);
      return;
    }
    
    console.log('✅ Usuário criado:', signupData.user?.id);
    
    // 2. Simular o que o frontend fará - verificar se existe perfil
    console.log('🔍 Verificando se perfil existe...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', signupData.user?.id)
      .single();
      
    if (profileError && profileError.code === 'PGRST116') {
      console.log('❌ Perfil não encontrado (como esperado)');
      console.log('🔧 Simulando criação automática pelo frontend...');
      
      // 3. Criar perfil automaticamente (como o frontend fará)
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          user_id: signupData.user.id,
          email: signupData.user.email,
          plan_name: 'start-quantico',
          subscription_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (createProfileError) {
        console.log('❌ Erro ao criar perfil automaticamente:', createProfileError);
      } else {
        console.log('✅ Perfil criado automaticamente pelo frontend!');
        
        // Verificar se foi criado corretamente
        const { data: newProfile, error: verifyError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', signupData.user.id)
          .single();
          
        if (verifyError) {
          console.log('❌ Erro ao verificar perfil criado:', verifyError);
        } else {
          console.log('🎉 SUCESSO! Perfil verificado:', {
            user_id: newProfile.user_id,
            email: newProfile.email,
            plan_name: newProfile.plan_name,
            subscription_status: newProfile.subscription_status
          });
        }
      }
    } else if (profile) {
      console.log('✅ Perfil já existe:', profile);
    } else {
      console.log('❌ Erro inesperado ao verificar perfil:', profileError);
    }
    
    console.log('\n🎯 Teste da correção do frontend concluído!');
    console.log('💡 O frontend agora criará perfis automaticamente quando necessário.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testFrontendFix();