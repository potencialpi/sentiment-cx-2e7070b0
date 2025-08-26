import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

// Contas de teste
const testAccounts = [
  { email: 'teste.basico@example.com', password: 'SecureTest2025!@#', plan: 'basico' },
  { email: 'teste.vortex@example.com', password: 'VortexSecure2025!@#', plan: 'vortex-pro' },
  { email: 'teste.nexus@example.com', password: 'NexusSecure2025!@#', plan: 'nexus-infinito' }
];

async function testRLSIsolation() {
  console.log('🔒 TESTE ESPECÍFICO DE ISOLAMENTO RLS');
  console.log('=====================================');
  
  const userSurveys = {};
  
  // 1. Criar surveys específicos para cada usuário
  console.log('\n📝 CRIANDO SURVEYS ESPECÍFICOS PARA CADA USUÁRIO');
  console.log('--------------------------------------------------');
  
  for (const account of testAccounts) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password
    });
    
    if (authError) {
      console.log(`❌ Erro de login para ${account.email}: ${authError.message}`);
      continue;
    }
    
    const userId = authData.user.id;
    console.log(`✅ Login: ${account.email} (${userId})`);
    
    // Criar survey específico
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .insert({
        title: `Survey PRIVADO de ${account.plan}`,
        description: `Este survey deve ser visível APENAS para ${account.email}`,
        user_id: userId,
        status: 'active'
      })
      .select()
      .single();
      
    if (surveyError) {
      console.log(`❌ Erro ao criar survey para ${account.email}: ${surveyError.message}`);
    } else {
      console.log(`✅ Survey criado: ${survey.id} para ${account.email}`);
      userSurveys[account.email] = {
        userId: userId,
        surveyId: survey.id,
        surveyTitle: survey.title
      };
    }
    
    await supabase.auth.signOut();
  }
  
  console.log('\n🔍 TESTANDO ISOLAMENTO - CADA USUÁRIO DEVE VER APENAS SEUS SURVEYS');
  console.log('--------------------------------------------------------------------');
  
  // 2. Testar isolamento - cada usuário deve ver apenas seus próprios surveys
  for (const account of testAccounts) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password
    });
    
    if (authError) {
      console.log(`❌ Erro de login para ${account.email}: ${authError.message}`);
      continue;
    }
    
    console.log(`\n👤 TESTANDO ACESSO PARA: ${account.email}`);
    
    // Buscar todos os surveys que este usuário pode ver
    const { data: visibleSurveys, error: selectError } = await supabase
      .from('surveys')
      .select('id, title, user_id')
      .order('created_at', { ascending: false });
      
    if (selectError) {
      console.log(`❌ Erro ao buscar surveys: ${selectError.message}`);
    } else {
      console.log(`   📊 Surveys visíveis: ${visibleSurveys.length}`);
      
      // Verificar se pode ver surveys de outros usuários
      const ownSurveys = visibleSurveys.filter(s => s.user_id === authData.user.id);
      const othersSurveys = visibleSurveys.filter(s => s.user_id !== authData.user.id);
      
      console.log(`   ✅ Próprios surveys: ${ownSurveys.length}`);
      console.log(`   ⚠️ Surveys de outros: ${othersSurveys.length}`);
      
      if (othersSurveys.length > 0) {
        console.log(`   🚨 PROBLEMA: Usuário pode ver surveys de outros usuários!`);
        othersSurveys.slice(0, 3).forEach(survey => {
          console.log(`      - ${survey.title} (ID: ${survey.id}, Owner: ${survey.user_id})`);
        });
      } else {
        console.log(`   ✅ ISOLAMENTO OK: Usuário vê apenas seus próprios surveys`);
      }
      
      // Listar os próprios surveys
      if (ownSurveys.length > 0) {
        console.log(`   📋 Próprios surveys:`);
        ownSurveys.slice(0, 3).forEach(survey => {
          console.log(`      - ${survey.title}`);
        });
      }
    }
    
    await supabase.auth.signOut();
  }
  
  console.log('\n🎯 RESUMO DO TESTE DE ISOLAMENTO');
  console.log('==================================');
  console.log('Se as políticas RLS estiverem funcionando corretamente:');
  console.log('- Cada usuário deve ver apenas seus próprios surveys');
  console.log('- "Surveys de outros" deve ser 0 para todos os usuários');
  console.log('- Usuários anônimos não devem conseguir inserir surveys');
}

testRLSIsolation().catch(console.error);