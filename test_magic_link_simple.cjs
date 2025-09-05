require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testMagicLinkFunction() {
  console.log('🔍 TESTE SIMPLES DA EDGE FUNCTION MAGIC-LINK');
  console.log('==================================================');

  try {
    // 1. Buscar uma survey existente
    console.log('\n1. Buscando survey existente...');
    const { data: surveys, error: surveyError } = await supabaseAdmin
      .from('surveys')
      .select('*')
      .limit(1);

    if (surveyError) {
      console.error('❌ Erro ao buscar survey:', surveyError);
      return;
    }

    if (!surveys || surveys.length === 0) {
      console.log('❌ Nenhuma survey encontrada');
      return;
    }

    const survey = surveys[0];
    console.log('✅ Survey encontrada:', survey.id);

    // 2. Testar a Edge Function magic-link
    console.log('\n2. Testando Edge Function magic-link...');
    
    const { data: functionResult, error: functionError } = await supabaseAdmin.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        surveyId: survey.id,
        email: 'test@example.com'
      }
    });

    if (functionError) {
      console.error('❌ Erro na Edge Function:', functionError);
      console.log('Status:', functionError.status);
      console.log('Message:', functionError.message);
      
      // Tentar obter mais detalhes do erro
      if (functionError.context) {
        console.log('Context:', functionError.context);
      }
    } else {
      console.log('✅ Edge Function executada com sucesso!');
      console.log('Resultado:', functionResult);
    }

    // 3. Verificar se foi criado um magic link
    console.log('\n3. Verificando magic links criados...');
    const { data: magicLinks, error: magicLinkError } = await supabaseAdmin
      .from('magic_links')
      .select('*')
      .eq('survey_id', survey.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (magicLinkError) {
      console.error('❌ Erro ao verificar magic links:', magicLinkError);
    } else if (magicLinks && magicLinks.length > 0) {
      console.log('✅ Magic link encontrado:', magicLinks[0]);
    } else {
      console.log('⚠️ Nenhum magic link encontrado');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testMagicLinkFunction();