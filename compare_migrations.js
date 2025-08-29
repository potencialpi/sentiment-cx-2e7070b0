import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function compareMigrations() {
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
      })
      .sort((a, b) => a.version.localeCompare(b.version));
    
    console.log('=== COMPARAÇÃO DE MIGRAÇÕES ===\n');
    
    console.log(`Migrações remotas: ${remoteMigrations.length}`);
    console.log(`Migrações locais: ${localFiles.length}\n`);
    
    // Criar sets para comparação
    const remoteVersions = new Set(remoteMigrations.map(m => m.version));
    const localVersions = new Set(localFiles.map(m => m.version));
    
    // Migrações que existem remotamente mas não localmente
    const missingLocally = remoteMigrations.filter(m => !localVersions.has(m.version));
    
    // Migrações que existem localmente mas não remotamente
    const missingRemotely = localFiles.filter(m => !remoteVersions.has(m.version));
    
    if (missingLocally.length > 0) {
      console.log('🔴 MIGRAÇÕES REMOTAS NÃO ENCONTRADAS LOCALMENTE:');
      missingLocally.forEach(m => {
        console.log(`  - ${m.version}: ${m.name || 'sem nome'}`);
      });
      console.log();
    }
    
    if (missingRemotely.length > 0) {
      console.log('🟡 MIGRAÇÕES LOCAIS NÃO APLICADAS REMOTAMENTE:');
      missingRemotely.forEach(m => {
        console.log(`  - ${m.version}: ${m.name}`);
      });
      console.log();
    }
    
    if (missingLocally.length === 0 && missingRemotely.length === 0) {
      console.log('✅ Todas as migrações estão sincronizadas!');
    } else {
      console.log('❌ Encontradas discrepâncias nas migrações.');
      console.log('\n=== DIAGNÓSTICO ===');
      console.log('O erro "Remote migration versions not found in local migrations directory"');
      console.log('indica que existem migrações aplicadas remotamente que não estão no diretório local.');
      
      if (missingLocally.length > 0) {
        console.log('\n🔧 SOLUÇÃO RECOMENDADA:');
        console.log('1. Fazer pull das migrações remotas ou');
        console.log('2. Criar arquivos locais para as migrações em falta ou');
        console.log('3. Resetar o estado das migrações (cuidado com dados)');
      }
    }
    
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

compareMigrations();