const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

async function verifyRLSPolicies() {
  console.log('🔍 Verificando políticas RLS aplicadas...');
  
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const verification = {
    timestamp: new Date().toISOString(),
    policies_found: [],
    permissions: [],
    rls_status: {},
    issues: [],
    test_results: {}
  };
  
  try {
    // 1. Verificar políticas usando SQL direto
    console.log('\n📋 Verificando políticas RLS existentes...');
    
    const { data: policies, error: policiesError } = await serviceClient
      .rpc('sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = 'surveys'
          ORDER BY policyname;
        `
      });
    
    if (policiesError) {
      console.log('❌ Erro ao buscar políticas:', policiesError.message);
      verification.issues.push(`Cannot fetch policies: ${policiesError.message}`);
      
      // Tentar método alternativo
      console.log('\n🔄 Tentando método alternativo...');
      
      // Usar uma query mais simples
      const { data: simpleTest, error: simpleError } = await serviceClient
        .from('surveys')
        .select('count')
        .limit(1);
      
      if (simpleError) {
        console.log('❌ Erro no teste simples:', simpleError.message);
        verification.issues.push(`Simple test failed: ${simpleError.message}`);
      } else {
        console.log('✅ Acesso básico funcionando');
      }
      
    } else {
      console.log(`✅ Encontradas ${policies.length} políticas`);
      verification.policies_found = policies;
      
      policies.forEach(policy => {
        console.log(`  📋 ${policy.policyname} (${policy.cmd})`);
        console.log(`      Roles: ${policy.roles}`);
        if (policy.qual) {
          console.log(`      Condição: ${policy.qual}`);
        }
        if (policy.with_check) {
          console.log(`      Check: ${policy.with_check}`);
        }
      });
    }
    
    // 2. Verificar permissões de tabela
    console.log('\n🔑 Verificando permissões de tabela...');
    
    const { data: permissions, error: permError } = await serviceClient
      .rpc('sql', {
        query: `
          SELECT 
            grantee,
            table_name,
            privilege_type,
            is_grantable
          FROM information_schema.role_table_grants 
          WHERE table_schema = 'public' 
          AND table_name = 'surveys'
          AND grantee IN ('anon', 'authenticated', 'service_role')
          ORDER BY grantee, privilege_type;
        `
      });
    
    if (permError) {
      console.log('❌ Erro ao buscar permissões:', permError.message);
      verification.issues.push(`Cannot fetch permissions: ${permError.message}`);
    } else {
      console.log(`✅ Encontradas ${permissions.length} permissões`);
      verification.permissions = permissions;
      
      permissions.forEach(perm => {
        console.log(`  🔐 ${perm.grantee}: ${perm.privilege_type}`);
      });
    }
    
    // 3. Testar isolamento com usuários específicos
    console.log('\n🧪 Testando isolamento com usuários específicos...');
    
    // Testar com usuário autenticado
    const testUsers = [
      {
        email: 'teste.isolamento.forte1@example.com',
        password: 'TesteSuperForte123!@#'
      },
      {
        email: 'teste.isolamento.forte2@example.com', 
        password: 'TesteSuperForte456!@#'
      }
    ];
    
    for (const testUser of testUsers) {
      console.log(`\n👤 Testando usuário: ${testUser.email}`);
      
      const testClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg');
      
      const { data: authData, error: authError } = await testClient.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });
      
      if (authError) {
        console.log(`❌ Erro no login: ${authError.message}`);
        verification.test_results[testUser.email] = { login: false, error: authError.message };
        continue;
      }
      
      console.log(`✅ Login bem-sucedido para ${testUser.email}`);
      console.log(`   User ID: ${authData.user.id}`);
      
      // Testar acesso aos surveys
      const { data: userSurveys, error: surveysError } = await testClient
        .from('surveys')
        .select('id, title, user_id')
        .limit(10);
      
      if (surveysError) {
        console.log(`✅ Acesso bloqueado: ${surveysError.message}`);
        verification.test_results[testUser.email] = {
          login: true,
          user_id: authData.user.id,
          surveys_accessible: 0,
          access_blocked: true,
          error: surveysError.message
        };
      } else {
        console.log(`⚠️  Usuário pode ver ${userSurveys.length} surveys`);
        
        // Verificar se são apenas os próprios surveys
        const ownSurveys = userSurveys.filter(s => s.user_id === authData.user.id);
        const otherSurveys = userSurveys.filter(s => s.user_id !== authData.user.id);
        
        console.log(`   - Próprios surveys: ${ownSurveys.length}`);
        console.log(`   - Surveys de outros: ${otherSurveys.length}`);
        
        if (otherSurveys.length > 0) {
          console.log('❌ VIOLAÇÃO DE ISOLAMENTO DETECTADA!');
          otherSurveys.forEach(survey => {
            console.log(`     - Survey "${survey.title}" (${survey.id}) do usuário ${survey.user_id}`);
          });
        }
        
        verification.test_results[testUser.email] = {
          login: true,
          user_id: authData.user.id,
          surveys_accessible: userSurveys.length,
          own_surveys: ownSurveys.length,
          other_surveys: otherSurveys.length,
          access_blocked: false,
          isolation_violation: otherSurveys.length > 0
        };
      }
      
      // Fazer logout
      await testClient.auth.signOut();
    }
    
    // 4. Resumo e análise
    console.log('\n📊 RESUMO DA VERIFICAÇÃO:');
    console.log(`📋 Políticas encontradas: ${verification.policies_found.length}`);
    console.log(`🔑 Permissões encontradas: ${verification.permissions.length}`);
    console.log(`👥 Usuários testados: ${Object.keys(verification.test_results).length}`);
    
    const violationsCount = Object.values(verification.test_results)
      .filter(result => result.isolation_violation).length;
    
    console.log(`${violationsCount > 0 ? '❌' : '✅'} Violações de isolamento: ${violationsCount}`);
    
    if (violationsCount > 0) {
      console.log('\n⚠️  PROBLEMAS CRÍTICOS DETECTADOS:');
      Object.entries(verification.test_results).forEach(([email, result]) => {
        if (result.isolation_violation) {
          console.log(`- ${email} pode ver ${result.other_surveys} surveys de outros usuários`);
        }
      });
      
      verification.issues.push('RLS policies are not working correctly - users can see other users\' data');
    }
    
    // Salvar verificação
    fs.writeFileSync('rls-verification-results.json', JSON.stringify(verification, null, 2));
    console.log('\n💾 Verificação salva em rls-verification-results.json');
    
  } catch (error) {
    console.error('❌ Erro crítico durante verificação:', error);
    verification.critical_error = error.message;
  }
  
  return verification;
}

// Executar verificação
verifyRLSPolicies().catch(console.error);