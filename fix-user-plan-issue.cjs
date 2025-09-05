const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserPlanIssue() {
  console.log('🔧 Diagnosticando e corrigindo problema do plano do usuário...');
  
  try {
    // 1. Verificar se as tabelas existem
    console.log('\n1️⃣ Verificando existência das tabelas...');
    
    // Verificar tabela profiles
    try {
      const { data: profilesTest, error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (profilesError) {
        console.log('❌ Tabela profiles:', profilesError.message);
      } else {
        console.log('✅ Tabela profiles existe');
      }
    } catch (e) {
      console.log('❌ Erro ao acessar tabela profiles:', e.message);
    }
    
    // Verificar tabela companies
    try {
      const { data: companiesTest, error: companiesError } = await supabase
        .from('companies')
        .select('count')
        .limit(1);
      
      if (companiesError) {
        console.log('❌ Tabela companies:', companiesError.message);
      } else {
        console.log('✅ Tabela companies existe');
      }
    } catch (e) {
      console.log('❌ Erro ao acessar tabela companies:', e.message);
    }
    
    // 2. Verificar usuários autenticados
    console.log('\n2️⃣ Verificando usuários autenticados...');
    
    // Simular o que o frontend faz
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('⚠️ Nenhuma sessão ativa encontrada');
      console.log('💡 Isso é normal se você não estiver logado');
    } else {
      console.log('✅ Sessão ativa encontrada:', session.user.id);
      
      // Testar a função getUserPlan
      console.log('\n3️⃣ Testando função getUserPlan...');
      
      try {
        // Buscar na tabela companies
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('plan_name')
          .eq('user_id', session.user.id)
          .single();
        
        console.log('Companies query result:', { data: companyData, error: companyError });
        
        // Buscar na tabela profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('plan_name')
          .eq('user_id', session.user.id)
          .single();
        
        console.log('Profiles query result:', { data: profileData, error: profileError });
        
      } catch (error) {
        console.error('❌ Erro ao testar getUserPlan:', error);
      }
    }
    
    // 3. Verificar estrutura das tabelas
    console.log('\n4️⃣ Verificando estrutura das tabelas...');
    
    // Verificar colunas da tabela profiles
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (!error && profiles && profiles.length > 0) {
        console.log('✅ Colunas da tabela profiles:', Object.keys(profiles[0]));
      } else if (!error) {
        console.log('⚠️ Tabela profiles existe mas está vazia');
      }
    } catch (e) {
      console.log('❌ Erro ao verificar estrutura da tabela profiles');
    }
    
    // Verificar colunas da tabela companies
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1);
      
      if (!error && companies && companies.length > 0) {
        console.log('✅ Colunas da tabela companies:', Object.keys(companies[0]));
      } else if (!error) {
        console.log('⚠️ Tabela companies existe mas está vazia');
      }
    } catch (e) {
      console.log('❌ Erro ao verificar estrutura da tabela companies');
    }
    
    // 4. Criar dados de teste se necessário
    console.log('\n5️⃣ Verificando se é necessário criar dados de teste...');
    
    if (session) {
      // Verificar se o usuário tem perfil
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (!existingProfile) {
        console.log('⚠️ Usuário não tem perfil, criando...');
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: session.user.id,
            plan_name: 'start-quantico',
            email: session.user.email
          });
        
        if (insertError) {
          console.error('❌ Erro ao criar perfil:', insertError);
        } else {
          console.log('✅ Perfil criado com sucesso!');
        }
      } else {
        console.log('✅ Usuário já tem perfil:', existingProfile);
      }
    }
    
    console.log('\n🎯 DIAGNÓSTICO COMPLETO!');
    console.log('\n💡 POSSÍVEIS SOLUÇÕES:');
    console.log('1. Se as tabelas não existem, execute as migrações do Supabase');
    console.log('2. Se as tabelas estão vazias, faça login no frontend para criar o perfil');
    console.log('3. Se o erro persiste, verifique se o usuário tem permissões RLS');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixUserPlanIssue();