const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

// Cliente com service role (admin)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testAuthenticatedSurveys() {
  console.log('🔍 Testando operações autenticadas na tabela surveys...');
  
  try {
    // Pegar um usuário real do sistema
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ Erro ao obter usuários:', usersError);
      return;
    }
    
    const testUser = users[0];
    console.log('👤 Usuário de teste:', testUser.email);
    
    // Simular cliente autenticado criando um cliente com token JWT
    // Para isso, vamos usar o service role mas simular operações de usuário autenticado
    
    // Teste 1: Tentar inserir survey como usuário autenticado
    console.log('\n1️⃣ Testando inserção de survey como usuário autenticado:');
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('surveys')
      .insert({
        title: 'Survey de Teste Autenticado',
        description: 'Teste de inserção com usuário autenticado',
        status: 'draft',
        user_id: testUser.user_id,
        unique_link: `test-${Date.now()}`,
        max_responses: 100,
        current_responses: 0
      })
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir survey:', insertError);
    } else {
      console.log('✅ Survey inserido com sucesso:', insertData[0].id);
      
      // Teste 2: Tentar atualizar o survey
      console.log('\n2️⃣ Testando atualização de survey:');
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('surveys')
        .update({
          title: 'Survey Atualizado',
          status: 'active'
        })
        .eq('id', insertData[0].id)
        .eq('user_id', testUser.user_id)
        .select();
      
      if (updateError) {
        console.error('❌ Erro ao atualizar survey:', updateError);
      } else {
        console.log('✅ Survey atualizado com sucesso');
      }
      
      // Teste 3: Tentar atualizar survey de outro usuário (deve falhar)
      console.log('\n3️⃣ Testando atualização de survey de outro usuário:');
      const { data: otherUsers, error: otherUsersError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .neq('user_id', testUser.user_id)
        .limit(1);
      
      if (otherUsers && otherUsers.length > 0) {
        const { data: unauthorizedUpdate, error: unauthorizedError } = await supabaseAdmin
          .from('surveys')
          .update({ title: 'Tentativa não autorizada' })
          .eq('id', insertData[0].id)
          .eq('user_id', otherUsers[0].user_id) // Tentando com user_id diferente
          .select();
        
        if (unauthorizedError) {
          console.log('✅ Atualização não autorizada bloqueada corretamente:', unauthorizedError.message);
        } else {
          console.error('❌ PROBLEMA: Atualização não autorizada foi permitida!');
        }
      }
      
      // Limpar o teste
      console.log('\n🧹 Limpando survey de teste...');
      const { error: deleteError } = await supabaseAdmin
        .from('surveys')
        .delete()
        .eq('id', insertData[0].id);
      
      if (deleteError) {
        console.error('❌ Erro ao deletar survey de teste:', deleteError);
      } else {
        console.log('✅ Survey de teste removido');
      }
    }
    
    // Teste 4: Verificar se existe algum survey que pode estar causando problema
    console.log('\n4️⃣ Verificando surveys existentes:');
    const { data: existingSurveys, error: existingError } = await supabaseAdmin
      .from('surveys')
      .select('id, title, status, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (existingError) {
      console.error('❌ Erro ao verificar surveys existentes:', existingError);
    } else {
      console.log('📋 Surveys recentes:');
      existingSurveys.forEach((survey, index) => {
        console.log(`  ${index + 1}. ${survey.title} (${survey.status}) - User: ${survey.user_id}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testAuthenticatedSurveys();