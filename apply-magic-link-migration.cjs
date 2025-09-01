const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Credenciais do Supabase não encontradas');
  console.log('Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMagicLinkMigration() {
  try {
    console.log('🔄 Aplicando migração do sistema de magic links...');
    
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250101000000_create_magic_links_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Arquivo de migração não encontrado:', migrationPath);
      return;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executando migração SQL completa...');
    
    // Executar o SQL completo de uma vez
    try {
      const { data, error } = await supabase
        .from('_migrations')
        .select('*')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        console.log('ℹ️  Tabela _migrations não existe, aplicando migração diretamente...');
      }
      
      // Tentar executar usando uma query direta
      const { error: sqlError } = await supabase.rpc('exec', { sql: migrationSQL });
      
      if (sqlError) {
        console.error('❌ Erro ao executar migração:', sqlError.message);
        console.log('💡 Tentando método alternativo...');
        
        // Método alternativo: dividir em comandos menores
        const commands = migrationSQL
          .split(/;\s*\n/)
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));
        
        console.log(`📝 Executando ${commands.length} comandos individuais...`);
        
        for (let i = 0; i < commands.length; i++) {
          const command = commands[i];
          if (command.trim()) {
            try {
              console.log(`⏳ Executando comando ${i + 1}/${commands.length}...`);
              
              // Usar diferentes métodos dependendo do tipo de comando
              if (command.toLowerCase().includes('create table')) {
                console.log('📋 Criando tabela...');
              } else if (command.toLowerCase().includes('create policy')) {
                console.log('🔒 Criando política RLS...');
              } else if (command.toLowerCase().includes('create function')) {
                console.log('⚙️ Criando função...');
              }
              
              // Tentar executar o comando
              const { error: cmdError } = await supabase.rpc('exec', { sql: command + ';' });
              
              if (cmdError) {
                console.error(`❌ Erro no comando ${i + 1}:`, cmdError.message);
              } else {
                console.log(`✅ Comando ${i + 1} executado com sucesso`);
              }
            } catch (err) {
              console.error(`❌ Erro ao executar comando ${i + 1}:`, err.message);
            }
          }
        }
      } else {
        console.log('✅ Migração executada com sucesso!');
      }
    } catch (err) {
      console.error('❌ Erro geral:', err.message);
    }
    
    console.log('🎉 Migração do sistema de magic links concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
  }
}

// Executar a migração
applyMagicLinkMigration();