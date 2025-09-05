const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  console.log('VITE_SUPABASE_ANON_KEY:', !!supabaseAnonKey);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function debugMagicLinkFunction() {
  console.log('🔍 DIAGNÓSTICO DETALHADO DA EDGE FUNCTION MAGIC-LINK');
  console.log('=' .repeat(60));

  let testSurveyId = null;
  let testUserId = null;
  
  try {
    // 1. Pular verificação de usuários - vamos usar dados das pesquisas existentes
    console.log('\n1. Pulando verificação de usuários (usando dados das pesquisas)...');

    // 2. Buscar pesquisa existente em vez de criar uma nova
    console.log('\n2. Buscando pesquisa existente...');
    const { data: existingSurveys, error: surveyError } = await supabaseAdmin
      .from('surveys')
      .select('id, title, user_id')
      .limit(1);

    if (surveyError) {
      console.error('❌ Erro ao buscar pesquisas:', surveyError);
      return;
    }

    if (existingSurveys && existingSurveys.length > 0) {
      testSurveyId = existingSurveys[0].id;
      testUserId = existingSurveys[0].user_id;
      console.log('✅ Usando pesquisa existente:', testSurveyId);
      console.log('✅ User ID da pesquisa:', testUserId);
    } else {
      console.log('❌ Nenhuma pesquisa encontrada no banco de dados');
      console.log('💡 Crie uma pesquisa primeiro através da interface web');
      return;
    }

    // 3. Testar acesso à tabela surveys com cliente anônimo
    console.log('\n3. Testando acesso anônimo à tabela surveys...');
    const { data: anonSurveys, error: anonError } = await supabaseAnon
      .from('surveys')
      .select('id')
      .eq('id', testSurveyId)
      .single();

    if (anonError) {
      console.log('✅ Acesso anônimo bloqueado (esperado):', anonError.message);
    } else {
      console.log('⚠️ Acesso anônimo permitido (inesperado):', anonSurveys);
    }

    // 4. Testar acesso com SERVICE_ROLE_KEY
    console.log('\n4. Testando acesso com SERVICE_ROLE_KEY...');
    const { data: adminSurveys, error: adminError } = await supabaseAdmin
      .from('surveys')
      .select('id, title, status')
      .eq('id', testSurveyId)
      .single();

    if (adminError) {
      console.error('❌ Erro com SERVICE_ROLE_KEY:', adminError);
    } else {
      console.log('✅ Acesso com SERVICE_ROLE_KEY funcionando:', adminSurveys);
    }

    // 5. Testar Edge Function diretamente
    console.log('\n5. Testando Edge Function magic-link...');
    
    const testEmail = 'test@example.com';
    const functionUrl = `${supabaseUrl}/functions/v1/magic-link`;
    
    const payload = {
      action: 'generate',
      email: testEmail,
      surveyId: testSurveyId
    };
    
    console.log('URL da função:', functionUrl);
    console.log('Payload:', payload);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload)
    });

    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Corpo da resposta (texto):', responseText);
    
    if (response.ok) {
      try {
        const responseJson = JSON.parse(responseText);
        console.log('✅ Resposta JSON:', responseJson);
      } catch (e) {
        console.log('⚠️ Resposta não é JSON válido');
      }
    } else {
      console.error('❌ Edge Function retornou erro:', response.status, responseText);
      
      // Tentar analisar o erro
      try {
        const errorJson = JSON.parse(responseText);
        console.log('Detalhes do erro:', errorJson);
      } catch (e) {
        console.log('Erro não é JSON válido');
      }
    }

    // 6. Verificar se a função log_audit_action existe e funciona
    console.log('\n6. Testando função log_audit_action...');
    const { data: auditResult, error: auditError } = await supabaseAdmin
      .rpc('log_audit_action', {
        p_action: 'TEST',
        p_table_name: 'test_table',
        p_record_id: null,
        p_old_values: null,
        p_new_values: { test: 'data' },
        p_details: { source: 'debug_magic_link_detailed.cjs' },
        p_ip_address: null,
        p_user_agent: 'debug-script'
      });

    if (auditError) {
      console.error('❌ Erro na função log_audit_action:', auditError);
    } else {
      console.log('✅ Função log_audit_action funcionando:', auditResult);
    }

    // 7. (Removido) Teste de env na Edge Function com action inválida
    // Esse teste estava retornando 400 por usar uma action não suportada
    // Se necessário, criamos uma rota específica no futuro

  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error);
  } finally {
    // Limpeza
    if (testSurveyId) {
      console.log('\n🧹 Limpando dados de teste...');
      const { error: deleteError } = await supabaseAdmin
        .from('surveys')
        .delete()
        .eq('id', testSurveyId);
      
      if (deleteError) {
        console.error('❌ Erro ao limpar pesquisa de teste:', deleteError);
      } else {
        console.log('✅ Pesquisa de teste removida');
      }
    }
  }
}

// Executar diagnóstico
debugMagicLinkFunction().catch(console.error);