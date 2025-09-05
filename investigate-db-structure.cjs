const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateDBStructure() {
  console.log('🔍 Investigando estrutura do banco de dados...');
  console.log('=' .repeat(60));

  // 1. Listar todos os schemas
  console.log('1. Listando schemas disponíveis...');
  try {
    const { data: schemas, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name
      `
    });

    if (schemaError) {
      console.log(`   ❌ Erro: ${schemaError.message}`);
    } else {
      console.log(`   📊 Schemas encontrados:`);
      if (schemas && schemas.length > 0) {
        schemas.forEach(schema => {
          console.log(`      - ${schema.schema_name}`);
        });
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 2. Listar todas as tabelas em todos os schemas
  console.log('\n2. Listando todas as tabelas...');
  try {
    const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity,
          forcerowsecurity
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY schemaname, tablename
      `
    });

    if (tableError) {
      console.log(`   ❌ Erro: ${tableError.message}`);
    } else {
      console.log(`   📊 Tabelas encontradas:`);
      if (tables && tables.length > 0) {
        tables.forEach(table => {
          const rlsStatus = table.rowsecurity ? '🔒' : '🔓';
          const forceStatus = table.forcerowsecurity ? '🔐' : '';
          console.log(`      - ${table.schemaname}.${table.tablename} ${rlsStatus}${forceStatus}`);
        });
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 3. Procurar especificamente por tabelas com 'survey' no nome
  console.log('\n3. Procurando tabelas relacionadas a surveys...');
  try {
    const { data: surveyTables, error: surveyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity,
          forcerowsecurity
        FROM pg_tables 
        WHERE tablename ILIKE '%survey%'
        ORDER BY schemaname, tablename
      `
    });

    if (surveyError) {
      console.log(`   ❌ Erro: ${surveyError.message}`);
    } else {
      console.log(`   📊 Tabelas relacionadas a surveys:`);
      if (surveyTables && surveyTables.length > 0) {
        surveyTables.forEach(table => {
          const rlsStatus = table.rowsecurity ? '🔒 RLS' : '🔓 Sem RLS';
          const forceStatus = table.forcerowsecurity ? ' (Forçado)' : '';
          console.log(`      - ${table.schemaname}.${table.tablename} - ${rlsStatus}${forceStatus}`);
        });
      } else {
        console.log('      Nenhuma tabela relacionada a surveys encontrada!');
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 4. Testar acesso direto usando o cliente Supabase
  console.log('\n4. Testando acesso via cliente Supabase...');
  try {
    const { data: directTest, error: directError } = await supabase
      .from('surveys')
      .select('*')
      .limit(1);
    
    if (directError) {
      console.log(`   ❌ Erro no acesso direto: ${directError.message}`);
    } else {
      console.log(`   ✅ Acesso direto funcionou: ${directTest ? directTest.length : 0} registros`);
      if (directTest && directTest.length > 0) {
        console.log(`      Exemplo de registro:`, Object.keys(directTest[0]));
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção no acesso direto: ${err.message}`);
  }

  // 5. Verificar se existe uma view ou tabela com outro nome
  console.log('\n5. Verificando views e tabelas no schema public...');
  try {
    const { data: publicObjects, error: publicError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `
    });

    if (publicError) {
      console.log(`   ❌ Erro: ${publicError.message}`);
    } else {
      console.log(`   📊 Objetos no schema public:`);
      if (publicObjects && publicObjects.length > 0) {
        publicObjects.forEach(obj => {
          console.log(`      - ${obj.table_name} (${obj.table_type})`);
        });
      } else {
        console.log('      Nenhum objeto encontrado no schema public!');
      }
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }

  // 6. Teste com usuário anônimo
  console.log('\n6. Testando acesso anônimo via cliente...');
  const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  try {
    const { data: anonTest, error: anonError } = await supabaseAnon
      .from('surveys')
      .select('*')
      .limit(1);
    
    if (anonError) {
      console.log('   ✅ SUCESSO: Acesso anônimo BLOQUEADO!');
      console.log(`      Erro: ${anonError.message}`);
    } else {
      console.log('   ❌ PROBLEMA: Acesso anônimo ainda permitido!');
      console.log(`      Dados: ${anonTest ? anonTest.length : 0} registros`);
    }
  } catch (error) {
    console.log('   ✅ SUCESSO: Acesso anônimo BLOQUEADO (exceção)!');
    console.log(`      Erro: ${error.message}`);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🔍 Investigação concluída!');
}

// Executar investigação
investigateDBStructure().catch(console.error);