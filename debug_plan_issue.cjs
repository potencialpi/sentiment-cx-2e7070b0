// Script para debugar o problema do plano NULL
const { createClient } = require('@supabase/supabase-js');

// Verificação de variáveis de ambiente
if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  console.error('❌ SUPABASE_URL não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_URL');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}


// Usar as credenciais do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Conectando ao Supabase:');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPlanIssue() {
  try {
    console.log('🔍 Debugando problema do plano NULL...');
    console.log('URL:', supabaseUrl);
    
    // 1. Verificar todos os perfis
    console.log('\n📋 Verificando perfis na tabela profiles:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, plan_name')
      .limit(10);
    
    if (profilesError) {
      console.error('❌ Erro ao buscar perfis:', profilesError);
    } else {
      console.log(`✅ Encontrados ${profiles.length} perfis:`);
      profiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. User: ${profile.user_id.substring(0, 8)}... | Plan: "${profile.plan_name}"`);
      });
    }
    
    // 2. Verificar se há perfis com plan_name NULL
    console.log('\n🔍 Verificando perfis com plan_name NULL:');
    const { data: nullPlans, error: nullError } = await supabase
      .from('profiles')
      .select('user_id, plan_name')
      .is('plan_name', null);
    
    if (nullError) {
      console.error('❌ Erro ao buscar perfis NULL:', nullError);
    } else {
      console.log(`📊 Perfis com plan_name NULL: ${nullPlans.length}`);
      nullPlans.forEach((profile, index) => {
        console.log(`  ${index + 1}. User: ${profile.user_id.substring(0, 8)}... | Plan: ${profile.plan_name}`);
      });
    }
    
    // 3. Verificar se há usuários sem perfil
    console.log('\n👥 Verificando usuários autenticados recentes:');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('⚠️  Não foi possível listar usuários (requer service role key)');
    } else {
      console.log(`📊 Total de usuários: ${users.length}`);
      
      // Verificar se todos os usuários têm perfil
      for (const user of users.slice(0, 5)) { // Verificar apenas os primeiros 5
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_name')
          .eq('user_id', user.id)
          .single();
        
        console.log(`  User: ${user.id.substring(0, 8)}... | Email: ${user.email} | Profile Plan: ${profile?.plan_name || 'SEM PERFIL'}`);
      }
    }
    
    // 4. Verificar estrutura da tabela profiles
    console.log('\n🏗️  Verificando estrutura da tabela profiles:');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'profiles' })
      .catch(() => null);
    
    if (!columns) {
      console.log('⚠️  Não foi possível verificar estrutura da tabela');
    }
    
    // 5. Testar a função validate_survey_limits
    console.log('\n🧪 Testando função validate_survey_limits:');
    console.log('A função será executada quando uma nova pesquisa for criada.');
    console.log('O erro "plano <NULL>" indica que o SELECT plan_name retornou NULL.');
    
    console.log('\n✅ Debug concluído!');
    console.log('\n💡 Possíveis soluções:');
    console.log('1. Verificar se o usuário tem um perfil na tabela profiles');
    console.log('2. Verificar se o plan_name não está NULL');
    console.log('3. Criar perfil padrão se não existir');
    console.log('4. Atualizar a função validate_survey_limits para lidar com NULL');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

debugPlanIssue();