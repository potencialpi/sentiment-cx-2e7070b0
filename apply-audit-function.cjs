const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Configurações do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyAuditFunction() {
  console.log('🔧 APLICANDO FUNÇÃO DE AUDITORIA\n');
  
  try {
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('create-audit-logs-table.sql', 'utf8');
    
    console.log('📄 Arquivo SQL carregado com sucesso');
    console.log('\n⚠️  IMPORTANTE: Este script precisa ser executado com privilégios administrativos');
    console.log('\n🔧 INSTRUÇÕES PARA APLICAR MANUALMENTE:');
    console.log('1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard');
    console.log('2. Vá para seu projeto: mjuxvppexydaeuoernxa');
    console.log('3. Clique em "SQL Editor" no menu lateral');
    console.log('4. Cole o conteúdo do arquivo create-audit-logs-table.sql');
    console.log('5. Execute o script clicando em "Run"');
    console.log('\n📋 CONTEÚDO DO ARQUIVO SQL:');
    console.log('=' .repeat(80));
    console.log(sqlContent);
    console.log('=' .repeat(80));
    
    return true;
  } catch (err) {
    console.log('❌ ERRO AO LER ARQUIVO SQL:', err.message);
    return false;
  }
}

// Executar
applyAuditFunction().then(success => {
  if (success) {
    console.log('\n✅ Instruções fornecidas para aplicar a função de auditoria!');
    console.log('\n🔄 Após aplicar o SQL, execute: node test_audit_function.cjs');
  } else {
    console.log('\n❌ Erro ao processar arquivo SQL.');
  }
}).catch(err => {
  console.error('❌ Erro inesperado:', err);
});