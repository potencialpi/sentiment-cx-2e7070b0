require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAccountsManually() {
  console.log('🔧 Corrigindo contas manualmente...');
  
  try {
    // 1. Buscar usuários sem perfil
    console.log('📋 Buscando usuários sem perfil...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Erro ao buscar usuários:', usersError);
      return;
    }
    
    console.log(`📊 Encontrados ${users.users.length} usuários`);
    
    for (const user of users.users) {
      // Verificar se já tem perfil
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (!existingProfile) {
        console.log(`👤 Criando perfil para usuário: ${user.email}`);
        
        // Criar perfil
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            plan_name: 'start-quantico',
            subscription_status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.log(`❌ Erro ao criar perfil para ${user.email}:`, profileError);
        } else {
          console.log(`✅ Perfil criado para ${user.email}`);
        }
        
        // Verificar se já tem empresa
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (!existingCompany) {
          // Criar empresa
          const companyName = user.user_metadata?.company_name || 'Minha Empresa';
          const { error: companyError } = await supabase
            .from('companies')
            .insert({
              user_id: user.id,
              name: companyName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (companyError) {
            console.log(`❌ Erro ao criar empresa para ${user.email}:`, companyError);
          } else {
            console.log(`✅ Empresa criada para ${user.email}`);
          }
        }
      } else {
        console.log(`✅ Usuário ${user.email} já tem perfil`);
      }
    }
    
    // 2. Testar criação de novo usuário
    console.log('\n🧪 Testando criação de novo usuário...');
    const testEmail = `test-manual-${Date.now()}@example.com`;
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'SuperSecurePassword2024!@#$'
    });
    
    if (signupError) {
      console.log('❌ Erro no signup:', signupError);
      return;
    }
    
    console.log('✅ Usuário criado:', signupData.user?.id);
    
    // Criar perfil manualmente para o novo usuário
    if (signupData.user) {
      console.log('📝 Criando perfil manualmente para o novo usuário...');
      const { error: newProfileError } = await supabase
        .from('profiles')
        .insert({
          user_id: signupData.user.id,
          email: signupData.user.email,
          plan_name: 'start-quantico',
          subscription_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (newProfileError) {
        console.log('❌ Erro ao criar perfil manual:', newProfileError);
      } else {
        console.log('✅ Perfil manual criado com sucesso!');
      }
      
      // Criar empresa manualmente
      const { error: newCompanyError } = await supabase
        .from('companies')
        .insert({
          user_id: signupData.user.id,
          name: 'Minha Empresa',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (newCompanyError) {
        console.log('❌ Erro ao criar empresa manual:', newCompanyError);
      } else {
        console.log('✅ Empresa manual criada com sucesso!');
      }
    }
    
    console.log('\n🎉 Correção manual concluída!');
    console.log('💡 Agora todos os usuários devem ter perfis e empresas.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixAccountsManually();