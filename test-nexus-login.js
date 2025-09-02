import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

// Cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNexusLogin() {
  console.log('🧪 TESTANDO LOGIN NEXUS');
  console.log('=' .repeat(40));

  try {
    // Fazer login com a conta nexus
    console.log('🔐 Fazendo login com teste.nexus@example.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'teste.nexus@example.com',
      password: 'senha123456'
    });

    if (authError) {
      console.error('❌ Erro no login:', authError.message);
      return;
    }

    console.log('✅ Login bem-sucedido!');
    console.log('👤 Usuário:', authData.user.id, authData.user.email);

    // Verificar o plano do usuário
    console.log('\n🔍 Verificando plano do usuário...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan, plan_type')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Erro ao buscar profile:', profileError.message);
    } else {
      console.log('📊 Plano encontrado:', profileData);
    }

    // Verificar se há pesquisas disponíveis
    console.log('\n📋 Verificando pesquisas disponíveis...');
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title, description')
      .limit(5);

    if (surveysError) {
      console.error('❌ Erro ao buscar pesquisas:', surveysError.message);
    } else {
      console.log('📊 Pesquisas encontradas:', surveys?.length || 0);
      if (surveys && surveys.length > 0) {
        console.log('📝 Primeira pesquisa:', surveys[0]);
      }
    }

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o teste
testNexusLogin();