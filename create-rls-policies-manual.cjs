const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createRLSPolicies() {
  console.log('🔒 Criando políticas RLS manualmente...');
  console.log('=' .repeat(60));

  const policies = [
    {
      name: 'surveys_authenticated_select',
      sql: `CREATE POLICY "surveys_authenticated_select" ON surveys FOR SELECT TO authenticated USING (auth.uid() = user_id)`
    },
    {
      name: 'surveys_authenticated_insert', 
      sql: `CREATE POLICY "surveys_authenticated_insert" ON surveys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL)`
    },
    {
      name: 'surveys_authenticated_update',
      sql: `CREATE POLICY "surveys_authenticated_update" ON surveys FOR UPDATE TO authenticated USING (auth.uid() = user_id AND auth.uid() IS NOT NULL) WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL)`
    },
    {
      name: 'surveys_authenticated_delete',
      sql: `CREATE POLICY "surveys_authenticated_delete" ON surveys FOR DELETE TO authenticated USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)`
    }
  ];

  // Primeiro, garantir que RLS está habilitado
  console.log('1. Habilitando RLS na tabela surveys...');
  try {
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE surveys ENABLE ROW LEVEL SECURITY'
    });
    if (rlsError) {
      console.log(`   ❌ Erro: ${rlsError.message}`);
    } else {
      console.log('   ✅ RLS habilitado');
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // Forçar RLS
  console.log('2. Forçando RLS na tabela surveys...');
  try {
    const { error: forceError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE surveys FORCE ROW LEVEL SECURITY'
    });
    if (forceError) {
      console.log(`   ❌ Erro: ${forceError.message}`);
    } else {
      console.log('   ✅ RLS forçado');
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // Criar cada política
  console.log('3. Criando políticas RLS...');
  for (const policy of policies) {
    console.log(`   Criando política: ${policy.name}`);
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: policy.sql
      });
      
      if (error) {
        console.log(`   ❌ Erro: ${error.message}`);
      } else {
        console.log(`   ✅ Política ${policy.name} criada`);
      }
    } catch (err) {
      console.log(`   ❌ Exceção: ${err.message}`);
    }
  }

  // Revogar permissões para anon
  console.log('4. Revogando permissões para usuários anônimos...');
  try {
    const { error: revokeError } = await supabase.rpc('exec_sql', {
      sql: 'REVOKE ALL ON surveys FROM anon'
    });
    if (revokeError) {
      console.log(`   ❌ Erro: ${revokeError.message}`);
    } else {
      console.log('   ✅ Permissões revogadas para anon');
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // Garantir permissões para authenticated
  console.log('5. Garantindo permissões para usuários autenticados...');
  try {
    const { error: grantError } = await supabase.rpc('exec_sql', {
      sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON surveys TO authenticated'
    });
    if (grantError) {
      console.log(`   ❌ Erro: ${grantError.message}`);
    } else {
      console.log('   ✅ Permissões concedidas para authenticated');
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 Verificando resultado final...');

  // Verificar políticas criadas
  try {
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'surveys' ORDER BY policyname`
    });

    if (policiesError) {
      console.log('⚠️ Não foi possível verificar políticas:', policiesError.message);
    } else {
      console.log('\n📋 Políticas RLS ativas na tabela surveys:');
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`   - ${policy.policyname} (${policy.cmd}) para ${policy.roles}`);
        });
      } else {
        console.log('   ❌ Nenhuma política encontrada!');
      }
    }
  } catch (error) {
    console.log('⚠️ Erro ao verificar políticas:', error.message);
  }

  // Testar acesso anônimo
  console.log('\n🧪 Testando acesso anônimo...');
  const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  try {
    const { data: testData, error: testError } = await supabaseAnon
      .from('surveys')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('✅ SUCESSO: Acesso anônimo à tabela surveys BLOQUEADO!');
      console.log(`   Erro: ${testError.message}`);
    } else {
      console.log('❌ PROBLEMA: Acesso anônimo à tabela surveys ainda permitido!');
      console.log(`   Dados retornados: ${testData ? testData.length : 0} registros`);
    }
  } catch (error) {
    console.log('✅ SUCESSO: Acesso anônimo à tabela surveys BLOQUEADO (exceção)!');
    console.log(`   Erro: ${error.message}`);
  }

  console.log('\n🎉 Configuração de políticas RLS concluída!');
}

// Executar criação de políticas
createRLSPolicies().catch(console.error);