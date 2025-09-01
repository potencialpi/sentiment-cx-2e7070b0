require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'OK' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 APLICANDO MIGRAÇÃO DO SISTEMA MAGIC LINKS\n');
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250101000000_create_magic_links_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Arquivo de migração não encontrado:', migrationPath);
      return;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Arquivo de migração carregado');
    console.log('📏 Tamanho:', migrationSQL.length, 'caracteres\n');
    
    // Dividir o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log('🔧 Executando', commands.length, 'comandos SQL...\n');
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        console.log(`📝 Comando ${i + 1}/${commands.length}:`, command.substring(0, 100) + '...');
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: command
        });
        
        if (error) {
          console.error(`❌ Erro no comando ${i + 1}:`, error.message);
          console.error('Comando:', command);
          
          // Se for erro de "já existe", continuar
          if (error.message.includes('already exists') || error.message.includes('já existe')) {
            console.log('⚠️  Objeto já existe, continuando...');
            continue;
          }
          
          throw error;
        }
        
        console.log(`✅ Comando ${i + 1} executado com sucesso`);
      }
    }
    
    console.log('\n🎉 MIGRAÇÃO APLICADA COM SUCESSO!');
    
    // Verificar se a tabela foi criada
    console.log('\n🔍 Verificando tabela magic_links...');
    const { data: tableCheck, error: checkError } = await supabase
      .from('magic_links')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Erro ao verificar tabela:', checkError.message);
    } else {
      console.log('✅ Tabela magic_links criada e acessível!');
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar migração
applyMigration()
  .then(() => {
    console.log('\n✅ Processo concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro no processo:', error);
    process.exit(1);
  });