import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Cliente com service role para acessar auth.users
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkTestUsers() {
  console.log('🔍 VERIFICANDO USUÁRIOS DE TESTE');
  console.log('============================================');
  
  const testEmails = [
    'teste.basico@example.com',
    'teste.vortex@example.com', 
    'teste.nexus@example.com'
  ];
  
  try {
    // Verificar usuários na tabela auth.users
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Erro ao listar usuários:', error.message);
      return;
    }
    
    console.log(`📊 Total de usuários encontrados: ${users.users.length}`);
    console.log('');
    
    for (const email of testEmails) {
      const user = users.users.find(u => u.email === email);
      if (user) {
        console.log(`✅ ${email}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
        console.log(`   Criado em: ${new Date(user.created_at).toLocaleString()}`);
        
        // Verificar perfil correspondente
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (profile) {
          console.log(`   Plano: ${profile.plan_name || 'N/A'}`);
          console.log(`   Status: ${profile.subscription_status || 'N/A'}`);
        } else {
          console.log(`   ⚠️ Perfil não encontrado`);
        }
      } else {
        console.log(`❌ ${email}: Usuário não encontrado`);
      }
      console.log('');
    }
    
    // Tentar redefinir senhas para usuários existentes
    console.log('🔄 REDEFININDO SENHAS DOS USUÁRIOS DE TESTE');
    console.log('============================================');
    
    for (const email of testEmails) {
      const user = users.users.find(u => u.email === email);
      if (user) {
        try {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: 'TestPassword123!' }
          );
          
          if (updateError) {
            console.log(`❌ Erro ao redefinir senha para ${email}: ${updateError.message}`);
          } else {
            console.log(`✅ Senha redefinida para ${email}`);
          }
        } catch (err) {
          console.log(`❌ Erro ao redefinir senha para ${email}: ${err.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkTestUsers().catch(console.error);