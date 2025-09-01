const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigrationViaPSQL() {
  try {
    console.log('🚀 Iniciando aplicação da migração via psql...');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('URL do Supabase não encontrada no .env.local');
    }
    
    // Extrair informações da URL do Supabase
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) {
      throw new Error('Formato de URL do Supabase inválido');
    }
    
    const projectRef = urlMatch[1];
    console.log(`📡 Projeto identificado: ${projectRef}`);
    
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250101000000_create_magic_links_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Arquivo de migração não encontrado: ${migrationPath}`);
    }
    
    console.log('📄 Arquivo de migração encontrado');
    
    // Construir string de conexão PostgreSQL
    const connectionString = `postgresql://postgres:[YOUR_PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;
    
    console.log('⚠️  ATENÇÃO: Você precisa substituir [YOUR_PASSWORD] pela senha real do banco de dados.');
    console.log('💡 Você pode encontrar a senha no Dashboard do Supabase > Settings > Database.');
    console.log('');
    console.log('🔧 Para aplicar a migração manualmente, execute:');
    console.log(`psql "${connectionString}" -f "${migrationPath}"`);
    console.log('');
    console.log('📋 Ou copie e cole o conteúdo SQL diretamente no SQL Editor do Supabase Dashboard.');
    
    // Mostrar o conteúdo da migração para facilitar
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Conteúdo da migração:');
    console.log('=' .repeat(80));
    console.log(migrationSQL);
    console.log('=' .repeat(80));
    
    console.log('');
    console.log('🌐 Alternativa: Use o SQL Editor no Supabase Dashboard:');
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Executar
applyMigrationViaPSQL();