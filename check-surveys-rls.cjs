const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSurveysRLS() {
  console.log('🔍 Verificando políticas RLS da tabela surveys...');
  
  try {
    // Verificar políticas RLS usando query direta
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'surveys');

    if (policiesError) {
      console.error('❌ Erro ao verificar políticas:', policiesError);
      
      // Tentar com query SQL direta
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('exec_sql', {
          sql: "SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'surveys';"
        });
      
      if (sqlError) {
        console.error('❌ Erro na query SQL:', sqlError);
      } else {
        console.log('📋 Resultado SQL:', sqlResult);
      }
    } else {
      console.log('📋 Políticas RLS encontradas:');
      console.log(JSON.stringify(policies, null, 2));
    }

    // Verificar se RLS está habilitado
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname, 
            tablename, 
            rowsecurity,
            relforcerowsecurity
          FROM pg_tables pt
          JOIN pg_class pc ON pc.relname = pt.tablename
          WHERE schemaname = 'public' AND tablename = 'surveys';
        `
      });

    if (rlsError) {
      console.error('❌ Erro ao verificar status RLS:', rlsError);
    } else {
      console.log('🔒 Status RLS:');
      console.log(JSON.stringify(rlsStatus, null, 2));
    }

    // Verificar permissões da tabela
    const { data: permissions, error: permError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            grantee,
            privilege_type,
            is_grantable
          FROM information_schema.table_privileges 
          WHERE table_schema = 'public' AND table_name = 'surveys'
          ORDER BY grantee, privilege_type;
        `
      });

    if (permError) {
      console.error('❌ Erro ao verificar permissões:', permError);
    } else {
      console.log('🔑 Permissões da tabela:');
      console.log(JSON.stringify(permissions, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkSurveysRLS();