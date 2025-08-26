import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Cliente com service role para criar usuários
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Contas de teste para criar
const testAccounts = [
  {
    email: 'teste.basico@example.com',
    password: 'senha123456',
    plan: 'basico',
    name: 'Usuário Básico',
    metadata: {
      full_name: 'Usuário Básico',
      subscription_plan: 'basico'
    }
  },
  {
    email: 'teste.vortex@example.com', 
    password: 'senha123456',
    plan: 'vortex-pro',
    name: 'Usuário Vortex',
    metadata: {
      full_name: 'Usuário Vortex',
      subscription_plan: 'vortex-pro'
    }
  },
  {
    email: 'teste.nexus@example.com',
    password: 'senha123456', 
    plan: 'nexus-infinito',
    name: 'Usuário Nexus',
    metadata: {
      full_name: 'Usuário Nexus',
      subscription_plan: 'nexus-infinito'
    }
  }
];

async function createTestAccounts() {
  console.log('🔧 CRIANDO CONTAS DE TESTE PARA RLS');
  console.log('=' .repeat(50));

  for (const account of testAccounts) {
    console.log(`\n👤 Criando conta: ${account.name}`);
    
    try {
      // Criar usuário usando Admin API
      const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: account.metadata
      });
      
      if (createError) {
        if (createError.message.includes('already registered')) {
          console.log(`   ⚠️  Usuário já existe: ${account.email}`);
          
          // Tentar atualizar o usuário existente
          const { data: users } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = users.users.find(u => u.email === account.email);
          
          if (existingUser) {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              existingUser.id,
              {
                password: account.password,
                user_metadata: account.metadata
              }
            );
            
            if (updateError) {
              console.log(`   ❌ Erro ao atualizar usuário: ${updateError.message}`);
            } else {
              console.log(`   ✅ Usuário atualizado com sucesso`);
              
              // Atualizar profile
              await updateProfile(existingUser.id, account);
            }
          }
        } else {
          console.log(`   ❌ Erro ao criar usuário: ${createError.message}`);
        }
      } else {
        console.log(`   ✅ Usuário criado: ${user.user.id}`);
        
        // Criar/atualizar profile
        await updateProfile(user.user.id, account);
      }
      
    } catch (error) {
      console.error(`   ❌ Erro geral para ${account.name}:`, error.message);
    }
  }
  
  console.log('\n🎯 CRIAÇÃO DE CONTAS CONCLUÍDA');
}

async function updateProfile(userId, account) {
  try {
    // Verificar se profile já existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    const profileData = {
      id: userId,
      email: account.email,
      full_name: account.name,
      subscription_plan: account.plan,
      plan_type: account.plan,
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    };
    
    if (existingProfile) {
      // Atualizar profile existente
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(profileData)
        .eq('id', userId);
      
      if (updateError) {
        console.log(`   ⚠️  Erro ao atualizar profile: ${updateError.message}`);
      } else {
        console.log(`   ✅ Profile atualizado`);
      }
    } else {
      // Criar novo profile
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData);
      
      if (insertError) {
        console.log(`   ⚠️  Erro ao criar profile: ${insertError.message}`);
      } else {
        console.log(`   ✅ Profile criado`);
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Erro no profile: ${error.message}`);
  }
}

// Função para listar usuários existentes
async function listExistingUsers() {
  console.log('\n📋 USUÁRIOS EXISTENTES:');
  console.log('-'.repeat(30));
  
  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.log(`❌ Erro ao listar usuários: ${error.message}`);
      return;
    }
    
    console.log(`Total de usuários: ${users.users.length}`);
    
    users.users.forEach(user => {
      console.log(`- ${user.email} (${user.id})`);
      if (user.user_metadata?.subscription_plan) {
        console.log(`  Plano: ${user.user_metadata.subscription_plan}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error.message);
  }
}

// Executar criação de contas
async function main() {
  await listExistingUsers();
  await createTestAccounts();
  await listExistingUsers();
}

main().catch(console.error);