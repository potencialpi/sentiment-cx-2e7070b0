const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfilesStructure() {
  console.log('🔍 Verificando estrutura da tabela profiles...');
  
  try {
    // Tentar buscar todos os campos da tabela profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ Erro ao buscar profiles:', error);
      return;
    }
    
    if (profiles && profiles.length > 0) {
      console.log('✅ Estrutura da tabela profiles:');
      console.log('Campos disponíveis:', Object.keys(profiles[0]));
      
      console.log('\n📊 Dados dos profiles:');
      profiles.forEach((profile, index) => {
        console.log(`\nProfile ${index + 1}:`);
        Object.entries(profile).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    } else {
      console.log('⚠️ Nenhum profile encontrado');
    }
    
    // Verificar se existe tabela de planos separada
    console.log('\n🔍 Verificando tabelas relacionadas a planos...');
    
    // Tentar buscar user_plans
    try {
      const { data: userPlans, error: userPlansError } = await supabase
        .from('user_plans')
        .select('*')
        .limit(3);
      
      if (!userPlansError && userPlans) {
        console.log('✅ Tabela user_plans encontrada:');
        console.log('Campos:', userPlans.length > 0 ? Object.keys(userPlans[0]) : 'Tabela vazia');
        userPlans.forEach((plan, index) => {
          console.log(`\nUser Plan ${index + 1}:`);
          Object.entries(plan).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        });
      }
    } catch (e) {
      console.log('❌ Tabela user_plans não encontrada ou sem acesso');
    }
    
    // Tentar buscar subscriptions
    try {
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .limit(3);
      
      if (!subscriptionsError && subscriptions) {
        console.log('\n✅ Tabela subscriptions encontrada:');
        console.log('Campos:', subscriptions.length > 0 ? Object.keys(subscriptions[0]) : 'Tabela vazia');
        subscriptions.forEach((sub, index) => {
          console.log(`\nSubscription ${index + 1}:`);
          Object.entries(sub).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        });
      }
    } catch (e) {
      console.log('❌ Tabela subscriptions não encontrada ou sem acesso');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkProfilesStructure();