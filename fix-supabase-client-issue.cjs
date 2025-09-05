const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simular a função getUserPlan para testar o erro "a.from is not a function"
async function testGetUserPlan(supabaseClient, userId) {
  console.log('🧪 Testando função getUserPlan...');
  console.log('📋 Tipo do supabaseClient:', typeof supabaseClient);
  console.log('📋 Propriedades do supabaseClient:', Object.keys(supabaseClient || {}));
  
  if (!supabaseClient) {
    console.error('❌ supabaseClient é null ou undefined');
    return null;
  }
  
  if (typeof supabaseClient.from !== 'function') {
    console.error('❌ supabaseClient.from não é uma função');
    console.error('📋 Tipo de supabaseClient.from:', typeof supabaseClient.from);
    return null;
  }
  
  let planCode = null;

  try {
    console.log('🔍 Tentando buscar na tabela companies...');
    
    // Tentar buscar o plano na tabela companies primeiro
    const { data: companyData, error: companyError } = await supabaseClient
      .from('companies')
      .select('plan_name')
      .eq('user_id', userId)
      .single();

    console.log('📊 Resultado companies:', { data: companyData, error: companyError });

    if (companyData?.plan_name) {
      planCode = companyData.plan_name;
      console.log('✅ Plano encontrado na tabela companies:', planCode);
    } else {
      console.log('🔍 Tentando buscar na tabela profiles...');
      
      // Se não encontrar na companies, tentar na profiles
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('plan_name')
        .eq('user_id', userId)
        .single();
      
      console.log('📊 Resultado profiles:', { data: profileData, error: profileError });
      
      if (profileData?.plan_name) {
        planCode = profileData.plan_name;
        console.log('✅ Plano encontrado na tabela profiles:', planCode);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar plano do usuário:', error);
    console.error('📋 Stack trace:', error.stack);
  }

  if (!planCode) {
    console.error('⚠️ Nenhum plano encontrado para o usuário:', userId);
    return null;
  }

  return planCode;
}

// Função para criar um perfil de teste
async function createTestProfile() {
  console.log('🏗️ Criando perfil de teste...');
  
  const testUserId = '00000000-0000-0000-0000-000000000001';
  
  try {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (existing) {
      console.log('✅ Perfil de teste já existe:', existing);
      return testUserId;
    }
    
    // Criar novo perfil
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        plan_name: 'start-quantico',
        email: 'test@example.com'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar perfil de teste:', error);
      return null;
    }
    
    console.log('✅ Perfil de teste criado:', data);
    return testUserId;
    
  } catch (error) {
    console.error('❌ Erro ao criar perfil de teste:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Iniciando teste do cliente Supabase...');
  
  // Teste 1: Verificar se o cliente Supabase está funcionando
  console.log('\n1️⃣ Testando cliente Supabase básico...');
  console.log('✅ Cliente criado com sucesso');
  console.log('📋 URL:', supabaseUrl);
  console.log('📋 Tipo do cliente:', typeof supabase);
  console.log('📋 Tem método from:', typeof supabase.from === 'function');
  
  // Teste 2: Criar perfil de teste
  console.log('\n2️⃣ Criando perfil de teste...');
  const testUserId = await createTestProfile();
  
  if (!testUserId) {
    console.error('❌ Não foi possível criar perfil de teste');
    return;
  }
  
  // Teste 3: Testar função getUserPlan
  console.log('\n3️⃣ Testando função getUserPlan...');
  const planCode = await testGetUserPlan(supabase, testUserId);
  
  if (planCode) {
    console.log('✅ Função getUserPlan funcionou corretamente!');
    console.log('📋 Plano encontrado:', planCode);
  } else {
    console.error('❌ Função getUserPlan falhou');
  }
  
  // Teste 4: Testar com cliente undefined/null
  console.log('\n4️⃣ Testando com cliente inválido...');
  await testGetUserPlan(null, testUserId);
  await testGetUserPlan(undefined, testUserId);
  await testGetUserPlan({}, testUserId);
  
  console.log('\n🎯 TESTE COMPLETO!');
}

main().catch(console.error);