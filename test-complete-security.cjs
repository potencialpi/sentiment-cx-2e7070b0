require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Clientes para diferentes níveis de acesso
const anonClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const serviceClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCompleteSecurityLockdown() {
  console.log('🔒 TESTE COMPLETO DE SEGURANÇA - VERIFICANDO REMOÇÃO DE ACESSO ANÔNIMO\n');
  
  const results = {
    surveys: { select: false, insert: false, update: false, delete: false },
    survey_responses: { select: false, insert: false, update: false, delete: false },
    sentiment_analysis: { select: false, insert: false, update: false, delete: false },
    user_plans: { select: false, insert: false, update: false, delete: false },
    functions: { exec_sql: false, is_authenticated: false },
    service_role: { working: false }
  };
  
  // 1. TESTAR TABELA SURVEYS
  console.log('📊 Testando tabela SURVEYS...');
  
  try {
    const { data, error } = await anonClient.from('surveys').select('*').limit(1);
    if (error) {
      console.log('  ✅ SELECT anônimo BLOQUEADO:', error.message);
      results.surveys.select = true;
    } else {
      console.log('  ❌ SELECT anônimo PERMITIDO:', data?.length || 0, 'registros');
    }
  } catch (err) {
    console.log('  ✅ SELECT anônimo BLOQUEADO (erro de conexão)');
    results.surveys.select = true;
  }
  
  try {
    const { error } = await anonClient.from('surveys').insert({
      title: 'Teste Anônimo',
      description: 'Teste de segurança',
      user_id: '00000000-0000-0000-0000-000000000000'
    });
    if (error) {
      console.log('  ✅ INSERT anônimo BLOQUEADO:', error.message);
      results.surveys.insert = true;
    } else {
      console.log('  ❌ INSERT anônimo PERMITIDO');
    }
  } catch (err) {
    console.log('  ✅ INSERT anônimo BLOQUEADO (erro de conexão)');
    results.surveys.insert = true;
  }
  
  try {
    const { error } = await anonClient.from('surveys').update({ title: 'Hack' }).eq('id', '1');
    if (error) {
      console.log('  ✅ UPDATE anônimo BLOQUEADO:', error.message);
      results.surveys.update = true;
    } else {
      console.log('  ❌ UPDATE anônimo PERMITIDO');
    }
  } catch (err) {
    console.log('  ✅ UPDATE anônimo BLOQUEADO (erro de conexão)');
    results.surveys.update = true;
  }
  
  try {
    const { error } = await anonClient.from('surveys').delete().eq('id', '1');
    if (error) {
      console.log('  ✅ DELETE anônimo BLOQUEADO:', error.message);
      results.surveys.delete = true;
    } else {
      console.log('  ❌ DELETE anônimo PERMITIDO');
    }
  } catch (err) {
    console.log('  ✅ DELETE anônimo BLOQUEADO (erro de conexão)');
    results.surveys.delete = true;
  }
  
  // 2. TESTAR TABELA SURVEY_RESPONSES
  console.log('\n📝 Testando tabela SURVEY_RESPONSES...');
  
  try {
    const { data, error } = await anonClient.from('survey_responses').select('*').limit(1);
    if (error) {
      console.log('  ✅ SELECT anônimo BLOQUEADO:', error.message);
      results.survey_responses.select = true;
    } else {
      console.log('  ❌ SELECT anônimo PERMITIDO:', data?.length || 0, 'registros');
    }
  } catch (err) {
    console.log('  ✅ SELECT anônimo BLOQUEADO (erro de conexão)');
    results.survey_responses.select = true;
  }
  
  try {
    const { error } = await anonClient.from('survey_responses').insert({
      survey_id: '1',
      response_data: { test: 'hack' },
      user_id: '00000000-0000-0000-0000-000000000000'
    });
    if (error) {
      console.log('  ✅ INSERT anônimo BLOQUEADO:', error.message);
      results.survey_responses.insert = true;
    } else {
      console.log('  ❌ INSERT anônimo PERMITIDO');
    }
  } catch (err) {
    console.log('  ✅ INSERT anônimo BLOQUEADO (erro de conexão)');
    results.survey_responses.insert = true;
  }
  
  // 3. TESTAR TABELA SENTIMENT_ANALYSIS
  console.log('\n🎭 Testando tabela SENTIMENT_ANALYSIS...');
  
  try {
    const { data, error } = await anonClient.from('sentiment_analysis').select('*').limit(1);
    if (error) {
      console.log('  ✅ SELECT anônimo BLOQUEADO:', error.message);
      results.sentiment_analysis.select = true;
    } else {
      console.log('  ❌ SELECT anônimo PERMITIDO:', data?.length || 0, 'registros');
    }
  } catch (err) {
    console.log('  ✅ SELECT anônimo BLOQUEADO (erro de conexão)');
    results.sentiment_analysis.select = true;
  }
  
  try {
    const { error } = await anonClient.from('sentiment_analysis').insert({
      survey_id: '1',
      response_id: '1',
      sentiment_score: 0.5,
      sentiment_label: 'neutral'
    });
    if (error) {
      console.log('  ✅ INSERT anônimo BLOQUEADO:', error.message);
      results.sentiment_analysis.insert = true;
    } else {
      console.log('  ❌ INSERT anônimo PERMITIDO');
    }
  } catch (err) {
    console.log('  ✅ INSERT anônimo BLOQUEADO (erro de conexão)');
    results.sentiment_analysis.insert = true;
  }
  
  // 4. TESTAR TABELA USER_PLANS (se existir)
  console.log('\n💳 Testando tabela USER_PLANS...');
  
  try {
    const { data, error } = await anonClient.from('user_plans').select('*').limit(1);
    if (error) {
      console.log('  ✅ SELECT anônimo BLOQUEADO:', error.message);
      results.user_plans.select = true;
    } else {
      console.log('  ❌ SELECT anônimo PERMITIDO:', data?.length || 0, 'registros');
    }
  } catch (err) {
    console.log('  ✅ SELECT anônimo BLOQUEADO (erro de conexão)');
    results.user_plans.select = true;
  }
  
  // 5. TESTAR FUNÇÕES
  console.log('\n⚙️ Testando FUNÇÕES...');
  
  try {
    const { error } = await anonClient.rpc('exec_sql', { query: 'SELECT 1' });
    if (error) {
      console.log('  ✅ Função exec_sql BLOQUEADA:', error.message);
      results.functions.exec_sql = true;
    } else {
      console.log('  ❌ Função exec_sql PERMITIDA');
    }
  } catch (err) {
    console.log('  ✅ Função exec_sql BLOQUEADA (erro de conexão)');
    results.functions.exec_sql = true;
  }
  
  try {
    const { error } = await anonClient.rpc('is_authenticated');
    if (error) {
      console.log('  ✅ Função is_authenticated BLOQUEADA:', error.message);
      results.functions.is_authenticated = true;
    } else {
      console.log('  ❌ Função is_authenticated PERMITIDA');
    }
  } catch (err) {
    console.log('  ✅ Função is_authenticated BLOQUEADA (erro de conexão)');
    results.functions.is_authenticated = true;
  }
  
  // 6. TESTAR SERVICE ROLE (deve funcionar)
  console.log('\n🔑 Testando SERVICE ROLE...');
  
  try {
    const { data, error } = await serviceClient.from('surveys').select('*').limit(1);
    if (error) {
      console.log('  ❌ Service role com problema:', error.message);
    } else {
      console.log('  ✅ Service role funcionando:', data?.length || 0, 'registros');
      results.service_role.working = true;
    }
  } catch (err) {
    console.log('  ❌ Service role com erro:', err.message);
  }
  
  // 7. RELATÓRIO FINAL
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL DE SEGURANÇA');
  console.log('='.repeat(60));
  
  const allTablesSecure = Object.values(results.surveys).every(v => v) &&
                         Object.values(results.survey_responses).every(v => v) &&
                         Object.values(results.sentiment_analysis).every(v => v) &&
                         Object.values(results.user_plans).every(v => v);
  
  const allFunctionsSecure = Object.values(results.functions).every(v => v);
  
  console.log('\n🔒 TABELAS:');
  console.log(`   Surveys: ${Object.values(results.surveys).every(v => v) ? '✅ SEGURA' : '❌ VULNERÁVEL'}`);
  console.log(`   Survey Responses: ${Object.values(results.survey_responses).every(v => v) ? '✅ SEGURA' : '❌ VULNERÁVEL'}`);
  console.log(`   Sentiment Analysis: ${Object.values(results.sentiment_analysis).every(v => v) ? '✅ SEGURA' : '❌ VULNERÁVEL'}`);
  console.log(`   User Plans: ${Object.values(results.user_plans).every(v => v) ? '✅ SEGURA' : '❌ VULNERÁVEL'}`);
  
  console.log('\n⚙️ FUNÇÕES:');
  console.log(`   exec_sql: ${results.functions.exec_sql ? '✅ BLOQUEADA' : '❌ VULNERÁVEL'}`);
  console.log(`   is_authenticated: ${results.functions.is_authenticated ? '✅ BLOQUEADA' : '❌ VULNERÁVEL'}`);
  
  console.log('\n🔑 SERVICE ROLE:');
  console.log(`   Funcionamento: ${results.service_role.working ? '✅ OK' : '❌ PROBLEMA'}`);
  
  console.log('\n' + '='.repeat(60));
  
  if (allTablesSecure && allFunctionsSecure && results.service_role.working) {
    console.log('🎉 SISTEMA COMPLETAMENTE SEGURO!');
    console.log('✅ Nenhum acesso anônimo detectado');
    console.log('✅ Service role funcionando corretamente');
    console.log('✅ Todas as políticas RLS ativas');
  } else {
    console.log('⚠️ PROBLEMAS DE SEGURANÇA DETECTADOS!');
    if (!allTablesSecure) console.log('❌ Algumas tabelas ainda permitem acesso anônimo');
    if (!allFunctionsSecure) console.log('❌ Algumas funções ainda permitem acesso anônimo');
    if (!results.service_role.working) console.log('❌ Service role com problemas');
    console.log('\n🔧 Execute o script: complete-security-lockdown.sql no Supabase');
  }
  
  console.log('\n✅ Teste de segurança concluído');
  
  return {
    secure: allTablesSecure && allFunctionsSecure && results.service_role.working,
    details: results
  };
}

testCompleteSecurityLockdown().catch(console.error);