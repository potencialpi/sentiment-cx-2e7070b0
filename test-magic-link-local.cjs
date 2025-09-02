require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('💡 Certifique-se de que .env.local contém VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMagicLinkProduction() {
  console.log('🧪 Testando Magic Link com URL de produção...');
  console.log('🌐 URL do Supabase:', supabaseUrl);
  console.log('🔗 Frontend URL configurada:', process.env.FRONTEND_URL);
  
  try {
    // 1. Verificar se a tabela magic_links existe
    console.log('\n1️⃣ Verificando tabela magic_links...');
    const { data: tables, error: tablesError } = await supabase
      .from('magic_links')
      .select('*')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Erro ao acessar tabela magic_links:', tablesError.message);
      return;
    }
    console.log('✅ Tabela magic_links acessível');
    
    // 2. Verificar se existe alguma pesquisa ativa
    console.log('\n2️⃣ Verificando pesquisas ativas...');
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title, status')
      .eq('status', 'active')
      .limit(5);
    
    if (surveysError) {
      console.error('❌ Erro ao buscar pesquisas:', surveysError.message);
      return;
    }
    
    if (!surveys || surveys.length === 0) {
      console.log('⚠️ Nenhuma pesquisa ativa encontrada');
      console.log('💡 Crie uma pesquisa ativa para testar o magic link');
      return;
    }
    
    console.log(`✅ Encontradas ${surveys.length} pesquisas ativas:`);
    surveys.forEach(survey => {
      console.log(`   - ${survey.title} (ID: ${survey.id})`);
    });
    
    // 3. Testar geração de magic link
    console.log('\n3️⃣ Testando geração de magic link...');
    const testEmail = 'teste@exemplo.com';
    const testSurveyId = surveys[0].id;
    
    console.log(`📧 Email de teste: ${testEmail}`);
    console.log(`📋 Survey ID: ${testSurveyId}`);
    
    // Simular chamada para a edge function
    const magicLinkResponse = await fetch(`${supabaseUrl}/functions/v1/magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        action: 'generate',
        email: testEmail,
        surveyId: testSurveyId
      })
    });
    
    const magicLinkResult = await magicLinkResponse.json();
    
    if (magicLinkResult.success) {
      console.log('✅ Magic link gerado com sucesso!');
      console.log('🔗 URL gerada:', magicLinkResult.data.magicLinkUrl);
      console.log('⏰ Expira em:', magicLinkResult.data.expiresAt);
      
      // Verificar se a URL usa a URL de produção
      if (magicLinkResult.data.magicLinkUrl.includes('sentiment-cx-2e7070b0-main.vercel.app')) {
        console.log('✅ URL configurada corretamente para produção (Vercel)');
      } else if (magicLinkResult.data.magicLinkUrl.includes('localhost')) {
        console.log('⚠️ URL ainda está usando localhost');
      } else {
        console.log('✅ URL configurada para produção:', magicLinkResult.data.magicLinkUrl);
      }
    } else {
      console.error('❌ Erro ao gerar magic link:', magicLinkResult.error);
    }
    
  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
  }
}

// Executar teste
testMagicLinkProduction().catch(console.error);