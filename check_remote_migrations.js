import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRemoteMigrations() {
  try {
    const { data, error } = await supabase
      .rpc('get_remote_migrations');
    
    if (error) {
      console.error('Erro ao consultar migrações:', error);
      return;
    }
    
    console.log('Migrações remotas encontradas:');
    data.forEach(migration => {
      console.log(`- ${migration.version}: ${migration.name || 'sem nome'}`);
    });
    
    console.log(`\nTotal de migrações remotas: ${data.length}`);
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

checkRemoteMigrations();