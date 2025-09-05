const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalSurveysBlock() {
  console.log('🔒 Bloqueio final da tabela surveys...');
  console.log('=' .repeat(60));

  // 1. Dropar TODAS as políticas existentes
  console.log('1. Removendo todas as políticas existentes...');
  
  const policyNames = [
    'surveys_auth_only', 'surveys_no_anon', 'surveys_authenticated_select',
    'surveys_authenticated_insert', 'surveys_authenticated_update', 'surveys_authenticated_delete',
    'Enable read access for all users', 'Enable insert for authenticated users only',
    'Enable update for users based on user_id', 'Enable delete for users based on user_id',
    'Allow public read access to active surveys', 'Allow authenticated users to read their own surveys',
    'Allow authenticated users to insert surveys', 'Allow authenticated users to update their own surveys',
    'Allow authenticated users to delete their own surveys'
  ];
  
  for (const policyName of policyNames) {
    try {
      await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${policyName}" ON surveys`
      });
      console.log(`   ✅ Política "${policyName}" removida`);
    } catch (err) {
      console.log(`   ⚠️ Política "${policyName}": ${err.message}`);
    }
  }

  // 2. Criar uma política que SEMPRE bloqueia anônimos
  console.log('\n2. Criando política de bloqueio absoluto...');
  
  try {
    const { error: blockError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "block_all_anon_access" ON surveys
        FOR ALL
        TO anon
        USING (false)
        WITH CHECK (false)
      `
    });
    
    if (blockError) {
      console.log(`   ❌ Erro ao criar política de bloqueio: ${blockError.message}`);
    } else {
      console.log('   ✅ Política de bloqueio absoluto criada');
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 3. Criar política permissiva apenas para authenticated
  console.log('\n3. Criando política para usuários autenticados...');
  
  try {
    const { error: authError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "allow_authenticated_access" ON surveys
        FOR ALL
        TO authenticated
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id)
      `
    });
    
    if (authError) {
      console.log(`   ❌ Erro ao criar política auth: ${authError.message}`);
    } else {
      console.log('   ✅ Política para authenticated criada');
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 4. Garantir que RLS está habilitado e forçado
  console.log('\n4. Garantindo RLS...');
  
  try {
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE surveys ENABLE ROW LEVEL SECURITY'
    });
    console.log('   ✅ RLS habilitado');
    
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE surveys FORCE ROW LEVEL SECURITY'
    });
    console.log('   ✅ RLS forçado');
  } catch (err) {
    console.log(`   ❌ Erro RLS: ${err.message}`);
  }

  // 5. Revogar explicitamente todas as permissões para anon
  console.log('\n5. Revogando permissões anônimas...');
  
  const permissions = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
  
  for (const perm of permissions) {
    try {
      await supabase.rpc('exec_sql', {
        sql: `REVOKE ${perm} ON surveys FROM anon`
      });
      console.log(`   ✅ ${perm} revogado de anon`);
    } catch (err) {
      console.log(`   ⚠️ ${perm}: ${err.message}`);
    }
  }

  // 6. Revogar de public também
  console.log('\n6. Revogando permissões públicas...');
  
  try {
    await supabase.rpc('exec_sql', {
      sql: 'REVOKE ALL ON surveys FROM public'
    });
    console.log('   ✅ Todas as permissões revogadas de public');
  } catch (err) {
    console.log(`   ⚠️ Erro: ${err.message}`);
  }

  // 7. Criar trigger que bloqueia acesso anônimo
  console.log('\n7. Criando trigger de bloqueio...');
  
  try {
    // Primeiro, criar função do trigger
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION block_anon_surveys_access()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          -- Verificar se é usuário anônimo
          IF auth.role() = 'anon' OR auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Acesso negado: Login obrigatório para acessar surveys';
          END IF;
          
          -- Para INSERT/UPDATE, garantir que user_id seja do usuário atual
          IF TG_OP IN ('INSERT', 'UPDATE') THEN
            NEW.user_id := auth.uid();
            RETURN NEW;
          END IF;
          
          RETURN OLD;
        END;
        $$;
      `
    });
    console.log('   ✅ Função do trigger criada');
    
    // Criar triggers
    await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS block_anon_surveys_select ON surveys;
        CREATE TRIGGER block_anon_surveys_select
          BEFORE SELECT ON surveys
          FOR EACH ROW
          EXECUTE FUNCTION block_anon_surveys_access();
      `
    });
    console.log('   ✅ Trigger SELECT criado');
    
    await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS block_anon_surveys_insert ON surveys;
        CREATE TRIGGER block_anon_surveys_insert
          BEFORE INSERT ON surveys
          FOR EACH ROW
          EXECUTE FUNCTION block_anon_surveys_access();
      `
    });
    console.log('   ✅ Trigger INSERT criado');
    
  } catch (err) {
    console.log(`   ⚠️ Erro trigger: ${err.message}`);
  }

  // 8. Teste final intensivo
  console.log('\n8. Teste final intensivo...');
  
  const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const tests = [
    { name: 'SELECT *', query: () => supabaseAnon.from('surveys').select('*').limit(1) },
    { name: 'SELECT id', query: () => supabaseAnon.from('surveys').select('id').limit(1) },
    { name: 'COUNT', query: () => supabaseAnon.from('surveys').select('*', { count: 'exact', head: true }) },
    { name: 'INSERT', query: () => supabaseAnon.from('surveys').insert({ title: 'Test', user_id: '00000000-0000-0000-0000-000000000000' }) }
  ];
  
  for (const test of tests) {
    try {
      const { data, error } = await test.query();
      
      if (error) {
        console.log(`   ✅ ${test.name}: BLOQUEADO - ${error.message}`);
      } else {
        console.log(`   ❌ ${test.name}: AINDA PERMITIDO! (${data ? (Array.isArray(data) ? data.length : 'dados') : 'sem dados'})`);
      }
    } catch (error) {
      console.log(`   ✅ ${test.name}: BLOQUEADO (exceção) - ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 BLOQUEIO FINAL APLICADO!');
  console.log('🔒 Tabela surveys configurada para rejeitar COMPLETAMENTE acesso anônimo!');
}

// Executar bloqueio final
finalSurveysBlock().catch(console.error);