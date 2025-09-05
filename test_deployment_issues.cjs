const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas:');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDeploymentIssues() {
  console.log('🔍 Testando possíveis problemas de deployment...');
  console.log('');

  try {
    // 1. Testar conexão com Supabase
    console.log('1. Testando conexão com Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('surveys')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('❌ Erro na conexão com Supabase:', healthError.message);
    } else {
      console.log('✅ Conexão com Supabase OK');
    }

    // 2. Testar Edge Functions
    console.log('\n2. Testando Edge Functions...');
    const { data: edgeTest, error: edgeError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'test'
      }
    });
    
    if (edgeError) {
      console.error('❌ Erro nas Edge Functions:', edgeError.message);
    } else {
      console.log('✅ Edge Functions acessíveis');
    }

    // 3. Verificar se existe pelo menos uma pesquisa
    console.log('\n3. Verificando pesquisas disponíveis...');
    const { data: surveys, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title, status')
      .eq('status', 'active')
      .limit(5);
    
    if (surveyError) {
      console.error('❌ Erro ao buscar pesquisas:', surveyError.message);
    } else if (!surveys || surveys.length === 0) {
      console.log('⚠️  Nenhuma pesquisa ativa encontrada');
    } else {
      console.log(`✅ ${surveys.length} pesquisa(s) ativa(s) encontrada(s)`);
      surveys.forEach(survey => {
        console.log(`   - ${survey.title} (ID: ${survey.id})`);
      });
    }

    // 4. Testar geração de magic link
    if (surveys && surveys.length > 0) {
      console.log('\n4. Testando geração de magic link...');
      const testSurvey = surveys[0];
      
      const { data: magicLinkResult, error: magicLinkError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'generate',
          email: 'test@example.com',
          surveyId: testSurvey.id
        }
      });
      
      if (magicLinkError) {
        console.error('❌ Erro na geração de magic link:', magicLinkError.message);
      } else if (magicLinkResult?.success) {
        console.log('✅ Magic link gerado com sucesso');
        console.log('   URL:', magicLinkResult.data?.magicLinkUrl || 'N/A');
      } else {
        console.error('❌ Falha na geração de magic link:', magicLinkResult?.error || 'Erro desconhecido');
      }
    }

    // 5. Verificar configurações de CORS
    console.log('\n5. Verificando configurações...');
    console.log('Frontend URL configurada:', process.env.FRONTEND_URL);
    console.log('Supabase URL:', supabaseUrl);
    
    // 6. Testar rota específica que está falhando
    console.log('\n6. Informações sobre o erro ERR_ABORTED:');
    console.log('Este erro geralmente indica:');
    console.log('- Problema de CORS');
    console.log('- Rota não encontrada no servidor');
    console.log('- Problema de configuração do SPA');
    console.log('- Timeout de requisição');
    console.log('');
    console.log('Soluções recomendadas:');
    console.log('1. Verificar se o vercel.json está configurado corretamente');
    console.log('2. Verificar se todas as variáveis de ambiente estão definidas no Vercel');
    console.log('3. Verificar se o build está sendo executado sem erros');
    console.log('4. Testar a aplicação localmente primeiro');

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

// Executar o teste
testDeploymentIssues().then(() => {
  console.log('\n🏁 Teste de deployment concluído');
}).catch(error => {
  console.error('❌ Erro fatal:', error.message);
  process.exit(1);
});