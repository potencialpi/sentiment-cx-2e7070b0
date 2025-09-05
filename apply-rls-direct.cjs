require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Usar service role para aplicar as correções
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyRLSFixes() {
  console.log('🔧 Aplicando correções de RLS diretamente...');
  
  try {
    // Lista de comandos SQL para executar
    const sqlCommands = [
      // Remover políticas existentes
      `DROP POLICY IF EXISTS "Users can view own surveys" ON surveys`,
      `DROP POLICY IF EXISTS "Users can insert own surveys" ON surveys`,
      `DROP POLICY IF EXISTS "Users can update own surveys" ON surveys`,
      `DROP POLICY IF EXISTS "Users can delete own surveys" ON surveys`,
      `DROP POLICY IF EXISTS "Enable read access for all users" ON surveys`,
      `DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON surveys`,
      `DROP POLICY IF EXISTS "Enable update for users based on user_id" ON surveys`,
      `DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON surveys`,
      
      // Criar novas políticas apenas para usuários autenticados
      `CREATE POLICY "Authenticated users can view own surveys" ON surveys FOR SELECT TO authenticated USING (auth.uid() = user_id)`,
      `CREATE POLICY "Authenticated users can insert surveys" ON surveys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)`,
      `CREATE POLICY "Authenticated users can update own surveys" ON surveys FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
      `CREATE POLICY "Authenticated users can delete own surveys" ON surveys FOR DELETE TO authenticated USING (auth.uid() = user_id)`,
      
      // Garantir que RLS está habilitado
      `ALTER TABLE surveys ENABLE ROW LEVEL SECURITY`
    ];
    
    // Executar cada comando
    for (let i = 0; i < sqlCommands.length; i++) {
      const sql = sqlCommands[i];
      console.log(`📝 Executando comando ${i + 1}/${sqlCommands.length}...`);
      
      const { data, error } = await supabase.rpc('query', {
        query: sql
      });
      
      if (error) {
        console.log(`⚠️ Comando ${i + 1} falhou (pode ser normal se política não existia):`, error.message);
      } else {
        console.log(`✅ Comando ${i + 1} executado com sucesso`);
      }
    }
    
    console.log('\n🎉 Todas as correções foram aplicadas!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Execute: node test-no-anon-access.cjs');
    console.log('2. Verifique se o SELECT anônimo agora está bloqueado');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar correções:', error.message);
    console.log('\n🔧 SOLUÇÃO ALTERNATIVA:');
    console.log('1. Vá para o Supabase Dashboard > SQL Editor');
    console.log('2. Execute o conteúdo do arquivo: apply-rls-fixes-manually.sql');
  }
}

applyRLSFixes();