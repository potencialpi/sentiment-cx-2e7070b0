const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

async function checkRLSPolicies() {
  console.log('🔍 Verificando políticas RLS no Supabase...');
  
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const diagnosis = {
    timestamp: new Date().toISOString(),
    rls_status: {},
    policies: {},
    permissions: {},
    issues_found: [],
    recommendations: [],
    raw_data: {}
  };
  
  try {
    // 1. Verificar dados brutos primeiro
    console.log('\n📊 Verificando dados existentes...');
    
    const { data: surveysData, error: surveysError } = await serviceClient
      .from('surveys')
      .select('id, user_id, title')
      .limit(10);
    
    if (surveysError) {
      console.log('❌ Erro ao buscar surveys:', surveysError.message);
      diagnosis.issues_found.push(`Cannot access surveys table: ${surveysError.message}`);
    } else {
      console.log(`✅ Encontrados ${surveysData.length} surveys`);
      diagnosis.raw_data.surveys_count = surveysData.length;
      
      // Agrupar por usuário
      const userGroups = {};
      surveysData.forEach(survey => {
        if (!userGroups[survey.user_id]) {
          userGroups[survey.user_id] = 0;
        }
        userGroups[survey.user_id]++;
      });
      
      diagnosis.raw_data.users_with_surveys = Object.keys(userGroups).length;
      console.log(`📈 Usuários com surveys: ${Object.keys(userGroups).length}`);
      Object.entries(userGroups).forEach(([userId, count]) => {
        console.log(`  - ${userId}: ${count} surveys`);
      });
    }
    
    // 2. Testar acesso com diferentes roles
    console.log('\n🔐 Testando acesso com role anônimo...');
    
    const anonClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg');
    
    const { data: anonSurveys, error: anonError } = await anonClient
      .from('surveys')
      .select('id, title')
      .limit(5);
    
    if (anonError) {
      console.log(`✅ Acesso anônimo bloqueado: ${anonError.message}`);
      diagnosis.rls_status.anon_blocked = true;
    } else {
      console.log(`⚠️  Usuários anônimos podem ver ${anonSurveys.length} surveys!`);
      diagnosis.rls_status.anon_blocked = false;
      diagnosis.issues_found.push('Anonymous users can access surveys data');
    }
    
    // 3. Verificar se conseguimos acessar informações do sistema
    console.log('\n🔍 Tentando verificar configurações do sistema...');
    
    // Tentar usar uma query SQL simples através do service client
    try {
      const { data: systemInfo, error: systemError } = await serviceClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['surveys', 'responses', 'profiles'])
        .limit(10);
      
      if (systemError) {
        console.log('❌ Não foi possível acessar information_schema:', systemError.message);
        diagnosis.issues_found.push(`Cannot access system tables: ${systemError.message}`);
      } else {
        console.log(`✅ Tabelas encontradas: ${systemInfo.map(t => t.table_name).join(', ')}`);
        diagnosis.raw_data.system_tables = systemInfo.map(t => t.table_name);
      }
    } catch (err) {
      console.log('❌ Erro ao acessar information_schema:', err.message);
      diagnosis.issues_found.push(`Exception accessing system info: ${err.message}`);
    }
    
    // 4. Análise baseada nos testes de isolamento
    console.log('\n🔍 Analisando resultados dos testes de isolamento...');
    
    // Ler resultados do teste anterior
    try {
      const isolationResults = JSON.parse(fs.readFileSync('isolation-test-results.json', 'utf8'));
      
      if (isolationResults.summary.isolation_violations > 0) {
        diagnosis.issues_found.push('CRÍTICO: Usuários autenticados podem ver surveys de outros usuários');
        diagnosis.recommendations.push('Implementar políticas RLS restritivas para tabela surveys');
        diagnosis.recommendations.push('Verificar se as políticas RLS estão sendo aplicadas corretamente');
        diagnosis.recommendations.push('Considerar recriar as políticas RLS do zero');
      }
      
      if (!isolationResults.summary.rls_working) {
        diagnosis.issues_found.push('RLS não está funcionando adequadamente');
        diagnosis.recommendations.push('Revisar todas as políticas RLS');
        diagnosis.recommendations.push('Verificar permissões GRANT nas tabelas');
      }
      
      diagnosis.raw_data.isolation_test_summary = isolationResults.summary;
      
    } catch (err) {
      console.log('⚠️  Não foi possível ler resultados do teste de isolamento:', err.message);
    }
    
    // 5. Recomendações específicas baseadas no problema
    console.log('\n💡 Gerando recomendações...');
    
    diagnosis.recommendations.push('URGENTE: Recriar políticas RLS para tabela surveys');
    diagnosis.recommendations.push('Aplicar política: CREATE POLICY "surveys_select_own" ON surveys FOR SELECT USING (auth.uid() = user_id);');
    diagnosis.recommendations.push('Aplicar política: CREATE POLICY "surveys_insert_own" ON surveys FOR INSERT WITH CHECK (auth.uid() = user_id);');
    diagnosis.recommendations.push('Aplicar política: CREATE POLICY "surveys_update_own" ON surveys FOR UPDATE USING (auth.uid() = user_id);');
    diagnosis.recommendations.push('Aplicar política: CREATE POLICY "surveys_delete_own" ON surveys FOR DELETE USING (auth.uid() = user_id);');
    diagnosis.recommendations.push('Verificar se RLS está habilitado: ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;');
    diagnosis.recommendations.push('Testar isolamento após aplicar as políticas');
    
    // 6. Resumo final
    console.log('\n📋 RESUMO DO DIAGNÓSTICO:');
    console.log(`${diagnosis.raw_data.surveys_count ? '✅' : '❌'} Acesso aos dados: ${diagnosis.raw_data.surveys_count || 0} surveys encontrados`);
    console.log(`${diagnosis.rls_status.anon_blocked ? '✅' : '❌'} Proteção anônima: ${diagnosis.rls_status.anon_blocked ? 'Funcionando' : 'FALHA'}`);
    console.log(`❌ Problemas críticos encontrados: ${diagnosis.issues_found.length}`);
    console.log(`💡 Recomendações: ${diagnosis.recommendations.length}`);
    
    if (diagnosis.issues_found.length > 0) {
      console.log('\n⚠️  PROBLEMAS CRÍTICOS IDENTIFICADOS:');
      diagnosis.issues_found.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    if (diagnosis.recommendations.length > 0) {
      console.log('\n💡 AÇÕES RECOMENDADAS:');
      diagnosis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    // Salvar diagnóstico
    fs.writeFileSync('rls-policies-diagnosis.json', JSON.stringify(diagnosis, null, 2));
    console.log('\n💾 Diagnóstico salvo em rls-policies-diagnosis.json');
    
  } catch (error) {
    console.error('❌ Erro crítico durante diagnóstico:', error);
    diagnosis.critical_error = error.message;
  }
  
  return diagnosis;
}

// Executar diagnóstico
checkRLSPolicies().catch(console.error);