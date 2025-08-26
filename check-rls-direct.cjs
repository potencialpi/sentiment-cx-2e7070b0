const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

async function checkRLSStatus() {
  console.log('🔍 Verificando status das políticas RLS...');
  
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // 1. Verificar se RLS está habilitado nas tabelas
    console.log('\n📋 Verificando status RLS das tabelas...');
    
    const { data: rlsStatus, error: rlsError } = await serviceClient.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('surveys', 'responses', 'profiles')
        ORDER BY tablename;
      `
    });
    
    if (rlsError) {
      console.log('❌ Erro ao verificar RLS:', rlsError.message);
      
      // Tentar método alternativo
      console.log('\n🔄 Tentando método alternativo...');
      const { data: tables, error: tablesError } = await serviceClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['surveys', 'responses', 'profiles']);
        
      if (tablesError) {
        console.log('❌ Erro ao buscar tabelas:', tablesError.message);
      } else {
        console.log('✅ Tabelas encontradas:', tables.map(t => t.table_name));
      }
    } else {
      console.log('✅ Status RLS das tabelas:');
      rlsStatus.forEach(table => {
        console.log(`  - ${table.tablename}: RLS ${table.rls_enabled ? 'HABILITADO' : 'DESABILITADO'}`);
      });
    }
    
    // 2. Verificar políticas existentes usando query SQL direta
    console.log('\n🔐 Verificando políticas existentes...');
    
    const { data: policies, error: policiesError } = await serviceClient.rpc('exec_sql', {
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
        AND tablename IN ('surveys', 'responses', 'profiles')
        ORDER BY tablename, policyname;
      `
    });
    
    if (policiesError) {
      console.log('❌ Erro ao buscar políticas:', policiesError.message);
    } else {
      console.log(`✅ Políticas encontradas: ${policies.length}`);
      policies.forEach(policy => {
        console.log(`  - ${policy.tablename}.${policy.policyname}:`);
        console.log(`    Comando: ${policy.cmd}`);
        console.log(`    Roles: ${policy.roles}`);
        console.log(`    Condição: ${policy.qual || 'N/A'}`);
        console.log(`    With Check: ${policy.with_check || 'N/A'}`);
        console.log('');
      });
    }
    
    // 3. Verificar permissões da tabela
    console.log('\n🔑 Verificando permissões das tabelas...');
    
    const { data: permissions, error: permError } = await serviceClient.rpc('exec_sql', {
      query: `
        SELECT 
          grantee,
          table_name,
          privilege_type
        FROM information_schema.role_table_grants 
        WHERE table_schema = 'public' 
        AND table_name IN ('surveys', 'responses', 'profiles')
        AND grantee IN ('anon', 'authenticated', 'public')
        ORDER BY table_name, grantee, privilege_type;
      `
    });
    
    if (permError) {
      console.log('❌ Erro ao buscar permissões:', permError.message);
    } else {
      console.log(`✅ Permissões encontradas: ${permissions.length}`);
      const permsByTable = {};
      permissions.forEach(perm => {
        if (!permsByTable[perm.table_name]) {
          permsByTable[perm.table_name] = {};
        }
        if (!permsByTable[perm.table_name][perm.grantee]) {
          permsByTable[perm.table_name][perm.grantee] = [];
        }
        permsByTable[perm.table_name][perm.grantee].push(perm.privilege_type);
      });
      
      Object.entries(permsByTable).forEach(([table, roles]) => {
        console.log(`  📊 ${table}:`);
        Object.entries(roles).forEach(([role, privs]) => {
          console.log(`    - ${role}: ${privs.join(', ')}`);
        });
      });
    }
    
    // 4. Verificar usuários existentes
    console.log('\n👥 Verificando usuários cadastrados...');
    
    const { data: users, error: usersError } = await serviceClient.rpc('exec_sql', {
      query: `
        SELECT 
          id,
          email,
          created_at
        FROM auth.users 
        WHERE email LIKE '%teste%' OR email LIKE '%example%'
        ORDER BY created_at DESC;
      `
    });
    
    if (usersError) {
      console.log('❌ Erro ao buscar usuários:', usersError.message);
    } else {
      console.log(`✅ Usuários de teste encontrados: ${users.length}`);
      users.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id})`);
      });
    }
    
    // 5. Análise dos dados de surveys
    console.log('\n📊 Analisando distribuição de surveys...');
    
    const { data: surveyStats, error: statsError } = await serviceClient.rpc('exec_sql', {
      query: `
        SELECT 
          user_id,
          COUNT(*) as survey_count,
          MIN(created_at) as first_survey,
          MAX(created_at) as last_survey
        FROM surveys 
        GROUP BY user_id 
        ORDER BY survey_count DESC;
      `
    });
    
    if (statsError) {
      console.log('❌ Erro ao analisar surveys:', statsError.message);
    } else {
      console.log(`✅ Estatísticas de surveys por usuário:`);
      surveyStats.forEach(stat => {
        console.log(`  - Usuário ${stat.user_id}: ${stat.survey_count} surveys`);
      });
    }
    
    // Salvar diagnóstico
    const diagnosis = {
      timestamp: new Date().toISOString(),
      rls_status: rlsStatus || null,
      policies: policies || null,
      permissions: permissions || null,
      users: users || null,
      survey_stats: surveyStats || null,
      errors: {
        rls_error: rlsError?.message || null,
        policies_error: policiesError?.message || null,
        permissions_error: permError?.message || null,
        users_error: usersError?.message || null,
        stats_error: statsError?.message || null
      }
    };
    
    fs.writeFileSync('rls-diagnosis-detailed.json', JSON.stringify(diagnosis, null, 2));
    console.log('\n💾 Diagnóstico salvo em rls-diagnosis-detailed.json');
    
  } catch (error) {
    console.error('❌ Erro crítico durante diagnóstico:', error);
  }
}

// Executar diagnóstico
checkRLSStatus().catch(console.error);