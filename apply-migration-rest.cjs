const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigrationViaREST() {
  try {
    console.log('🚀 Iniciando aplicação da migração via API REST...');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Credenciais do Supabase não encontradas no .env.local');
    }
    
    console.log(`📡 Conectando ao projeto: ${supabaseUrl}`);
    
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250101000000_create_magic_links_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Arquivo de migração não encontrado: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Arquivo de migração carregado com sucesso');
    
    // Dividir em comandos individuais para execução sequencial
    const commands = migrationSQL
      .split(/;\s*(?=\n|$)/)
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));
    
    console.log(`📝 Preparando execução de ${commands.length} comandos SQL...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          console.log(`⏳ Executando comando ${i + 1}/${commands.length}...`);
          
          // Fazer requisição POST para a API REST do Supabase
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            body: JSON.stringify({
              sql: command + ';'
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erro HTTP ${response.status} no comando ${i + 1}:`, errorText);
            errorCount++;
          } else {
            console.log(`✅ Comando ${i + 1} executado com sucesso`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Erro ao executar comando ${i + 1}:`, err.message);
          errorCount++;
        }
        
        // Pequena pausa entre comandos
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n📊 Resumo da migração:`);
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);
    console.log(`📝 Total de comandos: ${commands.length}`);
    
    if (errorCount === 0) {
      console.log('🎉 Migração do sistema de magic links concluída com sucesso!');
    } else {
      console.log('⚠️ Migração concluída com alguns erros. Verifique os logs acima.');
    }
    
  } catch (error) {
    console.error('❌ Erro fatal durante a migração:', error.message);
    process.exit(1);
  }
}

// Executar a migração
applyMigrationViaREST();