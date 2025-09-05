const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseSchema() {
  console.log('🔍 VERIFICANDO SCHEMA DO BANCO DE DADOS');
  console.log('=' .repeat(50));

  try {
    // 1. Tentar acessar diretamente a tabela surveys para verificar se existe
    console.log('\n1. Testando acesso à tabela surveys...');
    const { data: surveysTest, error: surveysTestError } = await supabaseAdmin
      .from('surveys')
      .select('*')
      .limit(1);

    if (surveysTestError) {
      console.error('❌ Erro ao acessar tabela surveys:', surveysTestError);
      if (surveysTestError.code === '42P01') {
        console.log('  → A tabela surveys não existe');
      }
    } else {
      console.log('✅ Tabela surveys existe e é acessível');
      console.log('  → Exemplo de registro:', surveysTest[0] || 'Nenhum registro encontrado');
    }

    // 2. Verificar tabela magic_links
    console.log('\n2. Testando acesso à tabela magic_links...');
    const { data: magicLinksTest, error: magicLinksError } = await supabaseAdmin
      .from('magic_links')
      .select('*')
      .limit(1);

    if (magicLinksError) {
      console.error('❌ Erro ao acessar tabela magic_links:', magicLinksError);
    } else {
      console.log('✅ Tabela magic_links existe e é acessível');
    }

    // 3. Verificar tabela audit_logs
    console.log('\n3. Testando acesso à tabela audit_logs...');
    const { data: auditLogsTest, error: auditLogsError } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .limit(1);

    if (auditLogsError) {
      console.error('❌ Erro ao acessar tabela audit_logs:', auditLogsError);
    } else {
      console.log('✅ Tabela audit_logs existe e é acessível');
    }

    // 4. Testar função log_audit_action
    console.log('\n4. Testando função log_audit_action...');
    const { data: auditResult, error: auditFuncError } = await supabaseAdmin
      .rpc('log_audit_action', {
        p_table_name: 'test_table',
        p_action: 'TEST',
        p_old_data: null,
        p_new_data: { test: 'data' },
        p_user_id: null
      });

    if (auditFuncError) {
      console.error('❌ Erro na função log_audit_action:', auditFuncError);
    } else {
      console.log('✅ Função log_audit_action funcionando');
    }

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  }
}

// Executar verificação
checkDatabaseSchema().catch(console.error);