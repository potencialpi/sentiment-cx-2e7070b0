require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Cliente com service role (usado nos scripts)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cliente anônimo (usado no frontend)
const supabaseAnon = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function reproduceError() {
  console.log('🔍 Tentando reproduzir o erro 42501 específico...');
  
  try {
    // Primeiro, vamos verificar se há surveys existentes
    console.log('\n📋 Verificando surveys existentes...');
    const { data: existingSurveys, error: listError } = await supabase
      .from('surveys')
      .select('id, title, created_at')
      .limit(5);
      
    if (listError) {
      console.log('❌ Erro ao listar surveys:', listError);
      return;
    }
    
    console.log(`✅ Encontradas ${existingSurveys?.length || 0} surveys`);
    if (existingSurveys && existingSurveys.length > 0) {
      console.log('📋 Primeiras surveys:');
      existingSurveys.forEach((survey, index) => {
        console.log(`   ${index + 1}. ${survey.id} - ${survey.title}`);
      });
    }
    
    // Teste diferentes cenários de UPDATE que podem causar o erro 42501
    console.log('\n🧪 Testando diferentes cenários de UPDATE...');
    
    if (existingSurveys && existingSurveys.length > 0) {
      const testSurvey = existingSurveys[0];
      
      // Cenário 1: UPDATE com service role
      console.log('\n🔑 Cenário 1: UPDATE com service role...');
      const { data: serviceUpdate, error: serviceUpdateError } = await supabase
        .from('surveys')
        .update({ 
          title: testSurvey.title, // Manter o mesmo título para não alterar dados
          updated_at: new Date().toISOString()
        })
        .eq('id', testSurvey.id)
        .select();
        
      if (serviceUpdateError) {
        console.log('❌ Erro UPDATE service role:', serviceUpdateError);
        if (serviceUpdateError.code === '42501') {
          console.log('🎯 ERRO 42501 REPRODUZIDO COM SERVICE ROLE!');
        }
      } else {
        console.log('✅ UPDATE service role funcionou');
      }
      
      // Cenário 2: UPDATE com chave anônima (mais provável de falhar)
      console.log('\n🔑 Cenário 2: UPDATE com chave anônima...');
      const { data: anonUpdate, error: anonUpdateError } = await supabaseAnon
        .from('surveys')
        .update({ 
          title: testSurvey.title,
          updated_at: new Date().toISOString()
        })
        .eq('id', testSurvey.id)
        .select();
        
      if (anonUpdateError) {
        console.log('❌ Erro UPDATE anônimo:', anonUpdateError);
        if (anonUpdateError.code === '42501') {
          console.log('🎯 ERRO 42501 REPRODUZIDO COM CHAVE ANÔNIMA!');
          console.log('\n📋 DIAGNÓSTICO:');
          console.log('   - O erro 42501 ocorre quando se tenta fazer UPDATE com chave anônima');
          console.log('   - Isso indica que as políticas RLS não permitem UPDATE para usuários não autenticados');
          console.log('   - Solução: Usar autenticação adequada ou ajustar políticas RLS');
        }
      } else {
        console.log('✅ UPDATE anônimo funcionou (inesperado)');
      }
      
      // Cenário 3: UPDATE sem WHERE clause (pode ser mais restritivo)
      console.log('\n🔑 Cenário 3: UPDATE sem WHERE específico...');
      const { data: bulkUpdate, error: bulkUpdateError } = await supabaseAnon
        .from('surveys')
        .update({ updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000') // Condição que afeta todos
        .select();
        
      if (bulkUpdateError) {
        console.log('❌ Erro UPDATE em massa:', bulkUpdateError);
        if (bulkUpdateError.code === '42501') {
          console.log('🎯 ERRO 42501 REPRODUZIDO EM UPDATE MASSA!');
        }
      } else {
        console.log('✅ UPDATE em massa funcionou');
      }
    }
    
    // Teste INSERT para comparação
    console.log('\n📝 Testando INSERT para comparação...');
    const { data: insertTest, error: insertError } = await supabaseAnon
      .from('surveys')
      .insert({
        title: 'Test Survey - DELETE ME',
        description: 'Survey de teste para verificar permissões',
        company_id: null
      })
      .select();
      
    if (insertError) {
      console.log('❌ Erro INSERT:', insertError);
      if (insertError.code === '42501') {
        console.log('🎯 ERRO 42501 TAMBÉM NO INSERT!');
      }
    } else {
      console.log('✅ INSERT funcionou, ID:', insertTest[0]?.id);
      
      // Limpar o registro de teste
      if (insertTest[0]?.id) {
        await supabase
          .from('surveys')
          .delete()
          .eq('id', insertTest[0].id);
        console.log('🧹 Registro de teste removido');
      }
    }
    
  } catch (error) {
    console.log('💥 Erro inesperado:', error);
  }
}

reproduceError().then(() => {
  console.log('\n✅ Análise concluída');
}).catch(console.error);