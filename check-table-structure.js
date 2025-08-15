import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTableStructure() {
  console.log('🔍 VERIFICANDO ESTRUTURA ATUAL DAS TABELAS');
  console.log('=' .repeat(50));
  
  try {
    // Verificar estrutura da tabela profiles
    console.log('\n📊 1. ESTRUTURA DA TABELA PROFILES:');
    
    const { data: profilesColumns, error: profilesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')
      .order('ordinal_position');
    
    if (profilesError) {
      console.log('❌ Erro ao verificar tabela profiles:', profilesError.message);
    } else if (profilesColumns && profilesColumns.length > 0) {
      console.log('✅ Tabela profiles encontrada:');
      profilesColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
      });
    } else {
      console.log('⚠️ Tabela profiles não encontrada ou sem colunas');
    }
    
    // Verificar estrutura da tabela companies
    console.log('\n📊 2. ESTRUTURA DA TABELA COMPANIES:');
    
    const { data: companiesColumns, error: companiesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'companies')
      .order('ordinal_position');
    
    if (companiesError) {
      console.log('❌ Erro ao verificar tabela companies:', companiesError.message);
    } else if (companiesColumns && companiesColumns.length > 0) {
      console.log('✅ Tabela companies encontrada:');
      companiesColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
      });
    } else {
      console.log('⚠️ Tabela companies não encontrada ou sem colunas');
    }
    
    // Listar todas as tabelas no schema public
    console.log('\n📊 3. TODAS AS TABELAS NO SCHEMA PUBLIC:');
    
    const { data: allTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.log('❌ Erro ao listar tabelas:', tablesError.message);
    } else if (allTables && allTables.length > 0) {
      console.log('✅ Tabelas encontradas:');
      allTables.forEach(table => {
        console.log(`   - ${table.table_name} (${table.table_type})`);
      });
    } else {
      console.log('⚠️ Nenhuma tabela encontrada no schema public');
    }
    
    // Verificar triggers existentes
    console.log('\n🔧 4. TRIGGERS EXISTENTES:');
    
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, event_object_table')
      .eq('trigger_schema', 'public')
      .order('trigger_name');
    
    if (triggersError) {
      console.log('❌ Erro ao verificar triggers:', triggersError.message);
    } else if (triggers && triggers.length > 0) {
      console.log('✅ Triggers encontrados:');
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} on ${trigger.event_object_table} (${trigger.event_manipulation})`);
      });
    } else {
      console.log('⚠️ Nenhum trigger encontrado');
    }
    
    // Verificar funções existentes
    console.log('\n⚙️ 5. FUNÇÕES EXISTENTES:');
    
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .order('routine_name');
    
    if (functionsError) {
      console.log('❌ Erro ao verificar funções:', functionsError.message);
    } else if (functions && functions.length > 0) {
      console.log('✅ Funções encontradas:');
      functions.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`);
      });
    } else {
      console.log('⚠️ Nenhuma função encontrada');
    }
    
    // Tentar acessar dados das tabelas diretamente
    console.log('\n📋 6. TESTANDO ACESSO DIRETO ÀS TABELAS:');
    
    // Teste profiles
    try {
      const { data: profilesData, error: profilesDataError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (profilesDataError) {
        console.log('❌ Erro ao acessar dados da tabela profiles:', profilesDataError.message);
      } else {
        console.log('✅ Tabela profiles acessível');
        if (profilesData && profilesData.length > 0) {
          console.log('📋 Colunas disponíveis:', Object.keys(profilesData[0]));
        }
      }
    } catch (err) {
      console.log('❌ Erro ao testar acesso à tabela profiles:', err.message);
    }
    
    // Teste companies
    try {
      const { data: companiesData, error: companiesDataError } = await supabase
        .from('companies')
        .select('*')
        .limit(1);
      
      if (companiesDataError) {
        console.log('❌ Erro ao acessar dados da tabela companies:', companiesDataError.message);
      } else {
        console.log('✅ Tabela companies acessível');
        if (companiesData && companiesData.length > 0) {
          console.log('📋 Colunas disponíveis:', Object.keys(companiesData[0]));
        }
      }
    } catch (err) {
      console.log('❌ Erro ao testar acesso à tabela companies:', err.message);
    }
    
    // Gerar relatório de estrutura
    const structureReport = {
      timestamp: new Date().toISOString(),
      tables: {
        profiles: {
          exists: !profilesError && profilesColumns && profilesColumns.length > 0,
          columns: profilesColumns || [],
          accessible: false // será atualizado abaixo
        },
        companies: {
          exists: !companiesError && companiesColumns && companiesColumns.length > 0,
          columns: companiesColumns || [],
          accessible: false // será atualizado abaixo
        }
      },
      all_tables: allTables || [],
      triggers: triggers || [],
      functions: functions || []
    };
    
    // Salvar relatório
    const fs = await import('fs');
    fs.writeFileSync('RELATORIO_ESTRUTURA_TABELAS.json', JSON.stringify(structureReport, null, 2));
    
    console.log('\n🎉 VERIFICAÇÃO DE ESTRUTURA CONCLUÍDA!');
    console.log('📄 Relatório salvo em: RELATORIO_ESTRUTURA_TABELAS.json');
    
    // Resumo
    console.log('\n📋 RESUMO:');
    console.log('=' .repeat(30));
    console.log(`📊 Tabelas encontradas: ${allTables?.length || 0}`);
    console.log(`🔧 Triggers encontrados: ${triggers?.length || 0}`);
    console.log(`⚙️ Funções encontradas: ${functions?.length || 0}`);
    console.log(`📋 Tabela profiles: ${structureReport.tables.profiles.exists ? '✅ Existe' : '❌ Não existe'}`);
    console.log(`📋 Tabela companies: ${structureReport.tables.companies.exists ? '✅ Existe' : '❌ Não existe'}`);
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error.message);
    process.exit(1);
  }
}

// Executar verificação
checkTableStructure().catch(console.error);