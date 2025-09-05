const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMagicLinkUrl() {
  console.log('🔗 Testando Magic Link URL...');
  console.log('');

  try {
    // 1. Buscar uma pesquisa existente
    console.log('1. Buscando pesquisa existente...');
    const { data: surveys, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title')
      .eq('status', 'active')
      .limit(1);
    
    if (surveyError || !surveys || surveys.length === 0) {
      console.error('❌ Erro ao buscar pesquisa:', surveyError?.message || 'Nenhuma pesquisa encontrada');
      return;
    }

    const survey = surveys[0];
    console.log(`✅ Pesquisa encontrada: ${survey.title} (ID: ${survey.id})`);

    // 2. Gerar magic link
    console.log('\n2. Gerando magic link...');
    const { data: magicLinkResult, error: magicLinkError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        email: 'test@example.com',
        surveyId: survey.id
      }
    });
    
    if (magicLinkError) {
      console.error('❌ Erro na geração de magic link:', magicLinkError.message);
      return;
    }

    if (!magicLinkResult?.success) {
      console.error('❌ Falha na geração de magic link:', magicLinkResult?.error || 'Erro desconhecido');
      return;
    }

    const magicLinkUrl = magicLinkResult.data?.magicLinkUrl;
    const token = magicLinkResult.data?.token;
    
    console.log('✅ Magic link gerado com sucesso!');
    console.log('URL completa:', magicLinkUrl);
    console.log('Token:', token);

    // 3. Extrair parâmetros da URL
    console.log('\n3. Analisando URL...');
    try {
      const url = new URL(magicLinkUrl);
      console.log('Protocolo:', url.protocol);
      console.log('Host:', url.host);
      console.log('Pathname:', url.pathname);
      console.log('Parâmetros:');
      url.searchParams.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });
    } catch (urlError) {
      console.error('❌ Erro ao analisar URL:', urlError.message);
    }

    // 4. Testar validação do token
    console.log('\n4. Testando validação do token...');
    const { data: validateResult, error: validateError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'validate',
        token: token
      }
    });
    
    if (validateError) {
      console.error('❌ Erro na validação:', validateError.message);
    } else if (validateResult?.success) {
      console.log('✅ Token válido!');
      console.log('Dados da validação:', JSON.stringify(validateResult.data, null, 2));
    } else {
      console.error('❌ Token inválido:', validateResult?.error || 'Erro desconhecido');
    }

    // 5. Verificar se o problema é específico do deployment
    console.log('\n5. Diagnóstico do problema ERR_ABORTED:');
    console.log('');
    console.log('URLs comparadas:');
    console.log('- URL gerada pelo magic link:', magicLinkUrl);
    console.log('- URL reportada pelo usuário: https://traesentiment-cx-2e7070b0-mainfsak-potencialpi-potencial-pi.vercel.app/');
    console.log('');
    
    if (magicLinkUrl.includes('traesentiment-cx-2e7070b0-mainfsak-potencialpi-potencial-pi.vercel.app')) {
      console.log('✅ URLs coincidem - o problema não é de configuração de URL');
      console.log('');
      console.log('Possíveis causas do ERR_ABORTED:');
      console.log('1. 🔧 Build do Vercel com problemas');
      console.log('2. 🌐 Problema de DNS/CDN');
      console.log('3. 📦 Dependências faltando no deployment');
      console.log('4. ⚙️  Variáveis de ambiente não configuradas no Vercel');
      console.log('5. 🚫 Timeout de inicialização');
      console.log('');
      console.log('Soluções recomendadas:');
      console.log('1. Verificar logs de build no Vercel');
      console.log('2. Redeployar a aplicação');
      console.log('3. Verificar se todas as env vars estão no Vercel');
      console.log('4. Testar com uma URL local primeiro');
    } else {
      console.log('❌ URLs não coincidem - problema de configuração identificado!');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar o teste
testMagicLinkUrl().then(() => {
  console.log('\n🏁 Teste de Magic Link URL concluído');
}).catch(error => {
  console.error('❌ Erro fatal:', error.message);
  process.exit(1);
});