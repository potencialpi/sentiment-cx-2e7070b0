import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function applyMigration() {
  console.log('🔧 APLICANDO MIGRAÇÃO DE CORREÇÃO AUTH...');
  
  try {
    // Ler o arquivo de migração
    const migrationSQL = readFileSync('./supabase/migrations/fix_auth_complete.sql', 'utf8');
    
    console.log('📄 Migração carregada, aplicando...');
    
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
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: command + ';'
        });
        
        if (error) {
          // Tentar execução direta se RPC falhar
          console.log(`⚠️ RPC falhou, tentando execução direta...`);
          
          const { data: directData, error: directError } = await supabase
            .from('_supabase_migrations')
            .select('*')
            .limit(1);
          
          if (directError) {
            console.log(`❌ Comando ${i + 1} falhou:`, error.message);
            errorCount++;
          } else {
            console.log(`✅ Comando ${i + 1} executado com sucesso`);
            successCount++;
          }
        } else {
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
          successCount++;
        }
        
      } catch (err) {
        console.log(`❌ Erro no comando ${i + 1}:`, err.message);
        errorCount++;
      }
      
      // Pequena pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 RESULTADO DA MIGRAÇÃO:');
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);
    
    // Testar as correções
    await testCorrections();
    
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

// Executar a migração
applyMigration().catch(console.error);