const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugRLSPolicies() {
  console.log('🔍 Debugando políticas RLS...');
  console.log('=' .repeat(60));

  // 1. Verificar se a tabela existe e tem RLS habilitado
  console.log('1. Verificando status da tabela surveys...');
  try {
    const { data: tableInfo, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity,
          forcerowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'surveys'
      `
    });

    if (tableError) {
      console.log(`   ❌ Erro: ${tableError.message}`);
    } else if (tableInfo && tableInfo.length > 0) {
      const table = tableInfo[0];
      console.log(`   ✅ Tabela encontrada:`);
      console.log(`      - RLS habilitado: ${table.rowsecurity}`);
      console.log(`      - RLS forçado: ${table.forcerowsecurity}`);
    } else {
      console.log('   ❌ Tabela surveys não encontrada!');
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 2. Verificar políticas usando diferentes consultas
  console.log('\n2. Verificando políticas (método 1 - pg_policies)...');
  try {
    const { data: policies1, error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          policyname,
          cmd,
          permissive,
          roles,
          qual,
          with_check
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'surveys'
        ORDER BY policyname
      `
    });

    if (error1) {
      console.log(`   ❌ Erro: ${error1.message}`);
    } else {
      console.log(`   📊 Encontradas ${policies1 ? policies1.length : 0} políticas:`);
      if (policies1 && policies1.length > 0) {
        policies1.forEach(policy => {
          console.log(`      - ${policy.policyname} (${policy.cmd}) para ${policy.roles}`);
        });
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 3. Verificar políticas usando pg_policy
  console.log('\n3. Verificando políticas (método 2 - pg_policy)...');
  try {
    const { data: policies2, error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.polname as policyname,
          p.polcmd as cmd,
          p.polpermissive as permissive,
          p.polroles as roles,
          pg_get_expr(p.polqual, p.polrelid) as qual,
          pg_get_expr(p.polwithcheck, p.polrelid) as with_check
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relname = 'surveys'
        ORDER BY p.polname
      `
    });

    if (error2) {
      console.log(`   ❌ Erro: ${error2.message}`);
    } else {
      console.log(`   📊 Encontradas ${policies2 ? policies2.length : 0} políticas:`);
      if (policies2 && policies2.length > 0) {
        policies2.forEach(policy => {
          console.log(`      - ${policy.policyname} (${policy.cmd})`);
          console.log(`        Condição: ${policy.qual || 'N/A'}`);
          console.log(`        Check: ${policy.with_check || 'N/A'}`);
        });
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 4. Tentar criar uma política simples para teste
  console.log('\n4. Criando política de teste...');
  try {
    // Primeiro, dropar se existir
    await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "test_policy" ON surveys'
    });

    // Criar política simples
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE POLICY "test_policy" ON surveys FOR SELECT TO authenticated USING (false)'
    });

    if (createError) {
      console.log(`   ❌ Erro ao criar política de teste: ${createError.message}`);
    } else {
      console.log('   ✅ Política de teste criada');
      
      // Verificar se aparece
      const { data: testCheck, error: testError } = await supabase.rpc('exec_sql', {
        sql: `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'surveys' AND policyname = 'test_policy'`
      });
      
      if (testError) {
        console.log(`   ❌ Erro ao verificar política de teste: ${testError.message}`);
      } else {
        console.log(`   📊 Política de teste encontrada: ${testCheck && testCheck.length > 0 ? 'SIM' : 'NÃO'}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 5. Verificar permissões da tabela
  console.log('\n5. Verificando permissões da tabela...');
  try {
    const { data: permissions, error: permError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          grantee,
          privilege_type,
          is_grantable
        FROM information_schema.table_privileges 
        WHERE table_schema = 'public' AND table_name = 'surveys'
        ORDER BY grantee, privilege_type
      `
    });

    if (permError) {
      console.log(`   ❌ Erro: ${permError.message}`);
    } else {
      console.log(`   📊 Permissões encontradas:`);
      if (permissions && permissions.length > 0) {
        permissions.forEach(perm => {
          console.log(`      - ${perm.grantee}: ${perm.privilege_type}`);
        });
      } else {
        console.log('      Nenhuma permissão encontrada');
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 6. Teste final de acesso anônimo
  console.log('\n6. Teste final de acesso anônimo...');
  const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  try {
    const { data: testData, error: testError } = await supabaseAnon
      .from('surveys')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('   ✅ SUCESSO: Acesso anônimo BLOQUEADO!');
      console.log(`      Erro: ${testError.message}`);
    } else {
      console.log('   ❌ PROBLEMA: Acesso anônimo ainda permitido!');
      console.log(`      Dados: ${testData ? testData.length : 0} registros`);
    }
  } catch (error) {
    console.log('   ✅ SUCESSO: Acesso anônimo BLOQUEADO (exceção)!');
    console.log(`      Erro: ${error.message}`);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🔍 Debug concluído!');
}

// Executar debug
debugRLSPolicies().catch(console.error);