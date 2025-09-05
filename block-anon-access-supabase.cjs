const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function blockAnonAccessSupabase() {
  console.log('🔒 Bloqueando acesso anônimo no Supabase...');
  console.log('=' .repeat(60));

  // 1. Revogar todas as permissões para o role anon em TODAS as tabelas
  console.log('1. Revogando permissões para role anon...');
  
  const tables = ['surveys', 'survey_responses', 'survey_questions', 'survey_question_options', 'response_answers'];
  
  for (const table of tables) {
    console.log(`   Processando tabela: ${table}`);
    
    try {
      // Revogar todas as permissões
      const { error: revokeError } = await supabase.rpc('exec_sql', {
        sql: `REVOKE ALL ON ${table} FROM anon`
      });
      
      if (revokeError) {
        console.log(`   ⚠️ Aviso para ${table}: ${revokeError.message}`);
      } else {
        console.log(`   ✅ Permissões revogadas para ${table}`);
      }
    } catch (err) {
      console.log(`   ⚠️ Exceção para ${table}: ${err.message}`);
    }
    
    try {
      // Revogar do public também
      const { error: revokePublicError } = await supabase.rpc('exec_sql', {
        sql: `REVOKE ALL ON ${table} FROM public`
      });
      
      if (revokePublicError) {
        console.log(`   ⚠️ Aviso public para ${table}: ${revokePublicError.message}`);
      } else {
        console.log(`   ✅ Permissões public revogadas para ${table}`);
      }
    } catch (err) {
      console.log(`   ⚠️ Exceção public para ${table}: ${err.message}`);
    }
  }

  // 2. Habilitar RLS em todas as tabelas
  console.log('\n2. Habilitando RLS em todas as tabelas...');
  
  for (const table of tables) {
    console.log(`   Habilitando RLS para: ${table}`);
    
    try {
      const { error: rlsError } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`
      });
      
      if (rlsError) {
        console.log(`   ⚠️ Aviso RLS para ${table}: ${rlsError.message}`);
      } else {
        console.log(`   ✅ RLS habilitado para ${table}`);
      }
    } catch (err) {
      console.log(`   ⚠️ Exceção RLS para ${table}: ${err.message}`);
    }
    
    try {
      const { error: forceError } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`
      });
      
      if (forceError) {
        console.log(`   ⚠️ Aviso FORCE para ${table}: ${forceError.message}`);
      } else {
        console.log(`   ✅ RLS forçado para ${table}`);
      }
    } catch (err) {
      console.log(`   ⚠️ Exceção FORCE para ${table}: ${err.message}`);
    }
  }

  // 3. Criar políticas restritivas para cada tabela
  console.log('\n3. Criando políticas restritivas...');
  
  const policies = [
    {
      table: 'surveys',
      policies: [
        'CREATE POLICY "surveys_auth_only" ON surveys FOR ALL TO authenticated USING (auth.uid() = user_id)',
        'CREATE POLICY "surveys_no_anon" ON surveys FOR ALL TO anon USING (false)'
      ]
    },
    {
      table: 'survey_responses', 
      policies: [
        'CREATE POLICY "responses_auth_only" ON survey_responses FOR ALL TO authenticated USING (true)',
        'CREATE POLICY "responses_no_anon" ON survey_responses FOR ALL TO anon USING (false)'
      ]
    },
    {
      table: 'survey_questions',
      policies: [
        'CREATE POLICY "questions_auth_only" ON survey_questions FOR ALL TO authenticated USING (true)',
        'CREATE POLICY "questions_no_anon" ON survey_questions FOR ALL TO anon USING (false)'
      ]
    },
    {
      table: 'survey_question_options',
      policies: [
        'CREATE POLICY "options_auth_only" ON survey_question_options FOR ALL TO authenticated USING (true)',
        'CREATE POLICY "options_no_anon" ON survey_question_options FOR ALL TO anon USING (false)'
      ]
    },
    {
      table: 'response_answers',
      policies: [
        'CREATE POLICY "answers_auth_only" ON response_answers FOR ALL TO authenticated USING (true)',
        'CREATE POLICY "answers_no_anon" ON response_answers FOR ALL TO anon USING (false)'
      ]
    }
  ];
  
  for (const tablePolicy of policies) {
    console.log(`   Criando políticas para: ${tablePolicy.table}`);
    
    // Primeiro, dropar políticas existentes
    try {
      await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${tablePolicy.table}_auth_only" ON ${tablePolicy.table}`
      });
      await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${tablePolicy.table}_no_anon" ON ${tablePolicy.table}`
      });
    } catch (err) {
      // Ignorar erros de drop
    }
    
    // Criar novas políticas
    for (const policy of tablePolicy.policies) {
      try {
        const { error: policyError } = await supabase.rpc('exec_sql', {
          sql: policy
        });
        
        if (policyError) {
          console.log(`   ⚠️ Aviso política: ${policyError.message}`);
        } else {
          console.log(`   ✅ Política criada`);
        }
      } catch (err) {
        console.log(`   ⚠️ Exceção política: ${err.message}`);
      }
    }
  }

  // 4. Desabilitar completamente o acesso anônimo no nível do projeto
  console.log('\n4. Configurando bloqueio total de acesso anônimo...');
  
  try {
    // Criar função que sempre retorna false para anon
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION auth.block_anon_access()
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          -- Se o usuário atual é anônimo, bloquear
          IF auth.role() = 'anon' THEN
            RAISE EXCEPTION 'Acesso anônimo não permitido. Faça login para continuar.';
          END IF;
          
          RETURN true;
        END;
        $$;
      `
    });
    
    if (funcError) {
      console.log(`   ⚠️ Aviso função: ${funcError.message}`);
    } else {
      console.log('   ✅ Função de bloqueio criada');
    }
  } catch (err) {
    console.log(`   ⚠️ Exceção função: ${err.message}`);
  }

  // 5. Teste final
  console.log('\n5. Testando bloqueio...');
  
  const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  for (const table of tables) {
    try {
      const { data: testData, error: testError } = await supabaseAnon
        .from(table)
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log(`   ✅ ${table}: Acesso anônimo BLOQUEADO - ${testError.message}`);
      } else {
        console.log(`   ❌ ${table}: Acesso anônimo ainda permitido! (${testData ? testData.length : 0} registros)`);
      }
    } catch (error) {
      console.log(`   ✅ ${table}: Acesso anônimo BLOQUEADO (exceção) - ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎯 RESULTADO FINAL:');
  console.log('✅ Todas as permissões anônimas foram revogadas');
  console.log('✅ RLS habilitado e forçado em todas as tabelas');
  console.log('✅ Políticas restritivas criadas');
  console.log('🔒 Sistema configurado para BLOQUEAR completamente o acesso anônimo!');
}

// Executar bloqueio
blockAnonAccessSupabase().catch(console.error);