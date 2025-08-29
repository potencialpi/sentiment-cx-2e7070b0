import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMissingMigrations() {
  try {
    // Obter migrações remotas
    const { data: remoteMigrations, error } = await supabase.rpc('get_remote_migrations');
    
    if (error) {
      console.error('Erro ao consultar migrações remotas:', error);
      return;
    }
    
    // Obter migrações locais
    const migrationsDir = './supabase/migrations';
    const localFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const version = file.split('_')[0];
        return { version, name: file };
      });
    
    const localVersions = new Set(localFiles.map(m => m.version));
    
    // Migrações que existem remotamente mas não localmente
    const missingLocally = remoteMigrations.filter(m => !localVersions.has(m.version));
    
    console.log(`Criando ${missingLocally.length} arquivos de migração em falta...\n`);
    
    let created = 0;
    
    for (const migration of missingLocally) {
      const fileName = migration.name && migration.name !== 'sem nome' 
        ? `${migration.version}_${migration.name}.sql`
        : `${migration.version}_remote_migration.sql`;
      
      const filePath = path.join(migrationsDir, fileName);
      
      // Verificar se o arquivo já existe (pode ter nome diferente)
      if (fs.existsSync(filePath)) {
        console.log(`⏭️  Pulando ${fileName} (já existe)`);
        continue;
      }
      
      // Criar arquivo de migração vazio com comentário
      const content = `-- Migração remota ${migration.version}\n-- Nome: ${migration.name || 'sem nome'}\n-- Esta migração foi aplicada remotamente e criada localmente para sincronização\n\n-- Conteúdo da migração (vazio - já aplicado remotamente)\nSELECT 1; -- placeholder\n`;
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Criado: ${fileName}`);
      created++;
    }
    
    console.log(`\n🎉 Processo concluído! ${created} arquivos criados.`);
    
    if (created > 0) {
      console.log('\n📝 PRÓXIMOS PASSOS:');
      console.log('1. Os arquivos foram criados como placeholders');
      console.log('2. Eles contêm apenas comentários pois as migrações já foram aplicadas remotamente');
      console.log('3. Teste novamente o comando do Supabase para verificar se o erro foi resolvido');
    }
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

createMissingMigrations();