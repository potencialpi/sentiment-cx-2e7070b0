import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const supabaseAnon = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

async function applyMigration() {
  // Permitir passar o caminho do arquivo via argumento CLI ou variável de ambiente
  const migrationPath = process.argv[2] || process.env.MIGRATION_FILE || './supabase/migrations/fix_auth_complete.sql';
  console.log(`🔧 Aplicando migração SQL: ${migrationPath}`);
  
  try {
    // Ler o arquivo de migração
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migração carregada, aplicando...');

    // Pré-checagem: tentar usar exec_sql; se falhar, avisar mas continuar tentando cada comando
    try {
      const { error: preErr } = await supabase.rpc('exec_sql', { sql: 'select 1;' });
      if (preErr) {
        console.log('ℹ️ Aviso: rpc exec_sql retornou erro na checagem prévia:', preErr.message);
      }
    } catch (e) {
      console.log('ℹ️ Aviso: não foi possível validar exec_sql previamente:', e.message);
    }
    
    // Dividir em comandos individuais (por ponto e vírgula)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Total de comandos SQL: ${commands.length}`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Pular comentários e comandos vazios
      if (command.startsWith('--') || command.trim() === '') {
        continue;
      }
      
      try {
        console.log(`⚡ Executando comando ${i + 1}/${commands.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: command + ';'
        });
        
        if (error) {
          console.log(`❌ Comando ${i + 1} falhou via RPC:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
          successCount++;
        }
        
      } catch (err) {
        console.log(`❌ Erro no comando ${i + 1}:`, err.message);
        errorCount++;
      }
      
      // Pequena pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    
    console.log('\n📊 RESULTADO DA MIGRAÇÃO:');
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);
    
    // Testar as correções genéricas auth
    await testCorrections();

    // Testar políticas RLS (apenas se tivermos anon key)
    if (supabaseAnon) {
      await testRLS();
    } else {
      console.log('\nℹ️ Testes RLS pulados (chave ANON não configurada)');
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    process.exit(1);
  }
}

async function testCorrections() {
  console.log('\n🧪 TESTANDO CORREÇÕES...');
  
  try {
    // Teste 1: Verificar se as tabelas existem
    console.log('📋 1. Verificando tabelas...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'companies']);
    
    if (tablesError) {
      console.log('❌ Erro ao verificar tabelas:', tablesError.message);
    } else {
      console.log('✅ Tabelas encontradas:', tables?.map(t => t.table_name) || []);
    }
    
    // Teste 2: Tentar SignUp simples
    console.log('\n📋 2. Testando SignUp simples...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signUpError) {
      console.log('❌ SignUp simples falhou:', signUpError.message);
      console.log('📋 Código do erro:', signUpError.status, signUpError.code);
    } else {
      console.log('✅ SignUp simples funcionando!');
      console.log('📋 Usuário criado:', signUpData.user?.email);
      
      // Limpar usuário de teste
      if (signUpData.user?.id) {
        try {
          await supabase.auth.admin.deleteUser(signUpData.user.id);
          console.log('🧹 Usuário de teste removido');
        } catch (cleanupError) {
          console.log('⚠️ Erro ao limpar usuário de teste:', cleanupError.message);
        }
      }
    }
    
    // Teste 3: Tentar SignUp com metadados
    console.log('\n📋 3. Testando SignUp com metadados...');
    
    const testEmailMeta = `test-meta-${Date.now()}@example.com`;
    
    const { data: signUpMetaData, error: signUpMetaError } = await supabase.auth.signUp({
      email: testEmailMeta,
      password: testPassword,
      options: {
        data: {
          full_name: 'Teste Usuario',
          company_name: 'Teste Company'
        }
      }
    });
    
    if (signUpMetaError) {
      console.log('❌ SignUp com metadados falhou:', signUpMetaError.message);
      console.log('📋 Código do erro:', signUpMetaError.status, signUpMetaError.code);
    } else {
      console.log('✅ SignUp com metadados funcionando!');
      console.log('📋 Usuário criado:', signUpMetaData.user?.email);
      
      // Limpar usuário de teste
      if (signUpMetaData.user?.id) {
        try {
          await supabase.auth.admin.deleteUser(signUpMetaData.user.id);
          console.log('🧹 Usuário de teste removido');
        } catch (cleanupError) {
          console.log('⚠️ Erro ao limpar usuário de teste:', cleanupError.message);
        }
      }
    }
    
    console.log('\n🎉 TESTES DE CORREÇÃO CONCLUÍDOS!');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
  }
}

async function testRLS() {
  console.log('\n🧪 TESTANDO RLS (anon)...');

  try {
    // 1) Selecionar uma pesquisa ativa com unique_link via service role
    const { data: surveys, error: srvErr } = await supabase
      .from('surveys')
      .select('id, unique_link, status')
      .eq('status', 'active')
      .not('unique_link', 'is', null)
      .limit(1);

    if (srvErr) {
      console.log('❌ Erro buscando survey de teste:', srvErr.message);
      return;
    }

    if (!surveys || surveys.length === 0) {
      console.log('ℹ️ Nenhuma survey ativa com unique_link encontrada para teste. Pulei testes RLS.');
      return;
    }

    const testSurvey = surveys[0];

    // 2) Como anônimo, tentar ler a survey pelo unique_link
    const { data: publicSurvey, error: anonSelectErr } = await supabaseAnon
      .from('surveys')
      .select('id')
      .eq('unique_link', testSurvey.unique_link)
      .single();

    if (anonSelectErr) {
      console.log('❌ RLS falhou: anon não conseguiu SELECT em surveys por unique_link:', anonSelectErr.message);
    } else {
      console.log('✅ RLS OK: anon conseguiu SELECT em surveys por unique_link');
    }

    // 3) Como anônimo, tentar inserir uma response
    const testResponse = {
      survey_id: testSurvey.id,
      respondent_id: `rls-test-${Date.now()}`,
      responses: {},
      sentiment_score: 0,
      sentiment_category: 'neutral'
    };

    const { data: insData, error: insErr } = await supabaseAnon
      .from('responses')
      .insert(testResponse)
      .select('id')
      .single();

    if (insErr) {
      console.log('❌ RLS falhou: anon não conseguiu INSERT em responses:', insErr.message);
    } else {
      console.log('✅ RLS OK: anon conseguiu INSERT em responses');
      // Limpeza
      if (insData?.id) {
        await supabase.from('responses').delete().eq('id', insData.id);
        console.log('🧹 Response de teste removida');
      }
    }
  } catch (e) {
    console.log('❌ Erro nos testes RLS:', e.message);
  }
}

// Executar a migração
applyMigration().catch(console.error);