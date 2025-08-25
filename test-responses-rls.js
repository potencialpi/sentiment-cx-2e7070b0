import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Cliente anônimo (como um respondente)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Cliente com service role (para verificar dados)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function testResponsesRLS() {
  console.log('🔍 Testando políticas RLS da tabela responses...');
  
  try {
    // 1. Buscar um survey de usuário com plano Nexus Infinito
    console.log('\n1. Buscando surveys de usuários com plano Nexus Infinito...');
    
    // Primeiro buscar usuários com plano Nexus Infinito
    const { data: nexusProfiles, error: profileError } = await supabaseService
      .from('profiles')
      .select('user_id, plan_name, plan_type')
      .eq('plan_name', 'nexus-infinito')
      .limit(5);
    
    if (profileError) {
      console.error('❌ Erro ao buscar profiles Nexus:', profileError);
      return;
    }
    
    let nexusSurveys = [];
    let nexusError = null;
    
    if (nexusProfiles && nexusProfiles.length > 0) {
      console.log('👥 Usuários Nexus encontrados:', nexusProfiles.length);
      
      const nexusUserIds = nexusProfiles.map(p => p.user_id);
      
      const { data: surveys, error } = await supabaseService
        .from('surveys')
        .select('id, title, status, unique_link, user_id')
        .eq('status', 'active')
        .not('unique_link', 'is', null)
        .in('user_id', nexusUserIds)
        .limit(1);
      
      nexusSurveys = surveys;
      nexusError = error;
    }
    
    if (nexusError) {
      console.error('❌ Erro ao buscar surveys Nexus:', nexusError);
      return;
    }
    
    let testSurvey;
    
    if (!nexusSurveys || nexusSurveys.length === 0) {
      console.log('⚠️ Nenhum survey ativo encontrado para usuários Nexus Infinito');
      
      // Buscar qualquer survey ativo para teste
      const { data: anySurveys, error: anyError } = await supabaseService
        .from('surveys')
        .select('id, title, status, unique_link, user_id')
        .eq('status', 'active')
        .not('unique_link', 'is', null)
        .limit(1);
      
      if (anyError || !anySurveys || anySurveys.length === 0) {
        console.log('❌ Nenhum survey ativo encontrado para teste');
        return;
      }
      
      console.log('📋 Usando survey alternativo para teste:', anySurveys[0]);
      testSurvey = anySurveys[0];
    } else {
      console.log('📋 Survey Nexus encontrado:', nexusSurveys[0]);
      testSurvey = nexusSurveys[0];
    }
    
    // 2. Tentar inserir uma resposta como usuário anônimo
    console.log('\n2. Tentando inserir resposta como usuário anônimo...');
    
    const testResponse = {
      survey_id: testSurvey.id,
      respondent_id: randomUUID(),
      responses: {
        "test_question": "test_answer",
        "timestamp": new Date().toISOString()
      }
    };
    
    const { data: insertResult, error: insertError } = await supabaseAnon
      .from('responses')
      .insert(testResponse)
      .select();
    
    if (insertError) {
      console.error('❌ ERRO ao inserir resposta:', insertError);
      console.error('   Código:', insertError.code);
      console.error('   Mensagem:', insertError.message);
      
      // Verificar políticas RLS atuais
      console.log('\n3. Verificando políticas RLS atuais...');
      await checkCurrentPolicies();
      
    } else {
      console.log('✅ Resposta inserida com sucesso:', insertResult);
      
      // Limpar dados de teste
      await supabaseService
        .from('responses')
        .delete()
        .eq('id', insertResult[0].id);
      
      console.log('🧹 Dados de teste removidos');
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

async function checkCurrentPolicies() {
  try {
    const { data: policies, error } = await supabaseService
      .rpc('get_table_policies', { table_name: 'responses' })
      .single();
    
    if (error) {
      console.log('⚠️ Não foi possível verificar políticas via RPC');
      
      // Verificar diretamente via SQL
      const { data: directPolicies, error: directError } = await supabaseService
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'responses')
        .eq('schemaname', 'public');
      
      if (directError) {
        console.error('❌ Erro ao verificar políticas:', directError);
      } else {
        console.log('📋 Políticas atuais:', directPolicies);
      }
    } else {
      console.log('📋 Políticas via RPC:', policies);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar políticas:', error);
  }
}

// Executar teste
testResponsesRLS().then(() => {
  console.log('\n🏁 Teste concluído');
}).catch(error => {
  console.error('❌ Erro fatal:', error);
});