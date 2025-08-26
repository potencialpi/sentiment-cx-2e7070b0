import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Cliente com service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixTestUsers() {
  console.log('🔧 CORRIGINDO USUÁRIOS DE TESTE');
  console.log('=====================================');
  
  const testUsers = [
    {
      email: 'teste.basico@example.com',
      id: '8606a106-96a9-4204-bd9c-cbad6a19e080',
      plan: 'basico',
      password: 'SecureTest2025!@#'
    },
    {
      email: 'teste.vortex@example.com', 
      id: 'aef1114d-63c8-4f03-8fdf-85bcf9ac1792',
      plan: 'vortex-pro',
      password: 'VortexSecure2025!@#'
    },
    {
      email: 'teste.nexus@example.com',
      id: 'cd08569a-0790-40a8-8af7-131d27203c62', 
      plan: 'nexus-infinito',
      password: 'NexusSecure2025!@#'
    }
  ];
  
  // 1. Redefinir senhas com senhas mais seguras
  console.log('🔐 REDEFININDO SENHAS');
  console.log('----------------------');
  
  for (const user of testUsers) {
    try {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: user.password }
      );
      
      if (updateError) {
        console.log(`❌ Erro ao redefinir senha para ${user.email}: ${updateError.message}`);
      } else {
        console.log(`✅ Senha redefinida para ${user.email}`);
      }
    } catch (err) {
      console.log(`❌ Erro ao redefinir senha para ${user.email}: ${err.message}`);
    }
  }
  
  console.log('');
  
  // 2. Criar perfis para os usuários
  console.log('👤 CRIANDO PERFIS');
  console.log('------------------');
  
  for (const user of testUsers) {
    try {
      // Verificar se o perfil já existe
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (existingProfile) {
        console.log(`⚠️ Perfil já existe para ${user.email}`);
        continue;
      }
      
      // Criar novo perfil
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          plan_name: user.plan,
          plan_type: user.plan,
          subscription_status: 'active',
          status: 'active'
        })
        .select()
        .single();
        
      if (profileError) {
        console.log(`❌ Erro ao criar perfil para ${user.email}: ${profileError.message}`);
      } else {
        console.log(`✅ Perfil criado para ${user.email} (Plano: ${user.plan})`);
      }
    } catch (err) {
      console.log(`❌ Erro ao criar perfil para ${user.email}: ${err.message}`);
    }
  }
  
  console.log('');
  
  // 3. Testar autenticação com as novas senhas
  console.log('🔑 TESTANDO AUTENTICAÇÃO');
  console.log('-------------------------');
  
  const supabaseClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg');
  
  for (const user of testUsers) {
    try {
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (authError) {
        console.log(`❌ Falha na autenticação para ${user.email}: ${authError.message}`);
      } else {
        console.log(`✅ Autenticação bem-sucedida para ${user.email}`);
        
        // Fazer logout
        await supabaseClient.auth.signOut();
      }
    } catch (err) {
      console.log(`❌ Erro na autenticação para ${user.email}: ${err.message}`);
    }
  }
  
  console.log('');
  console.log('🎯 CREDENCIAIS ATUALIZADAS:');
  console.log('============================');
  testUsers.forEach(user => {
    console.log(`${user.email} -> ${user.password}`);
  });
}

fixTestUsers().catch(console.error);