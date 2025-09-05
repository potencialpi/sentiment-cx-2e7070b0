const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql, description) {
  console.log(`\n🔧 ${description}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sql
    });
    
    if (error) {
      console.error(`❌ Erro: ${error.message}`);
      return false;
    } else {
      console.log(`✅ ${description} - Sucesso`);
      if (data && typeof data === 'object' && data.length > 0) {
        console.log('📋 Resultado:', data);
      }
      return true;
    }
  } catch (error) {
    console.error(`❌ Erro geral: ${error.message}`);
    return false;
  }
}

async function applyBootstrapAndEliminateAnonymous() {
  console.log('🚀 INICIANDO: Bootstrap + Eliminação de Acesso Anônimo');
  
  // ETAPA 1: Aplicar bootstrap da função exec_sql
  console.log('\n=== ETAPA 1: Bootstrap da função exec_sql ===');
  
  try {
    const bootstrapSQL = fs.readFileSync('bootstrap-exec-sql.sql', 'utf8');
    
    // Dividir em comandos individuais
    const bootstrapCommands = bootstrapSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 10 && !cmd.startsWith('--'));
    
    for (let i = 0; i < bootstrapCommands.length; i++) {
      const command = bootstrapCommands[i];
      await executeSQL(command, `Bootstrap comando ${i + 1}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
  } catch (error) {
    console.error('❌ Erro ao ler bootstrap-exec-sql.sql:', error.message);
  }
  
  // ETAPA 2: Aplicar eliminação de acesso anônimo
  console.log('\n=== ETAPA 2: Eliminação de Acesso Anônimo ===');
  
  try {
    const eliminateSQL = fs.readFileSync('eliminate-anonymous-access.sql', 'utf8');
    
    // Dividir em comandos individuais
    const eliminateCommands = eliminateSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 10 && !cmd.startsWith('--'));
    
    for (let i = 0; i < eliminateCommands.length; i++) {
      const command = eliminateCommands[i];
      await executeSQL(command, `Eliminação comando ${i + 1}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
  } catch (error) {
    console.error('❌ Erro ao ler eliminate-anonymous-access.sql:', error.message);
  }
  
  // ETAPA 3: Verificação final
  console.log('\n=== ETAPA 3: Verificação Final ===');
  
  await executeSQL(`
    SELECT 
      'Verificação de políticas RLS' as check_type,
      COUNT(*) as total_policies
    FROM pg_policies 
    WHERE schemaname = 'public'
  `, 'Contagem de políticas RLS');
  
  await executeSQL(`
    SELECT 
      tablename,
      COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY tablename
    ORDER BY tablename
  `, 'Políticas por tabela');
  
  console.log('\n🎉 CONCLUÍDO: Sistema configurado sem acesso anônimo!');
  console.log('\n⚠️  IMPORTANTE: Agora TODOS os usuários devem estar autenticados!');
  console.log('📝 Próximos passos:');
  console.log('   1. Testar login/signup no frontend');
  console.log('   2. Verificar se não há mais erros de permissão');
  console.log('   3. Confirmar que surveys só são acessíveis por usuários autenticados');
}

applyBootstrapAndEliminateAnonymous();