require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMagicLinkValidation() {
  console.log('🔍 TESTANDO VALIDAÇÃO E USO DE MAGIC LINK\n');
  
  try {
    // 1. Primeiro gerar um magic link
    console.log('1️⃣ Gerando magic link...');
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id, title')
      .eq('status', 'active')
      .limit(1);
    
    if (!surveys || surveys.length === 0) {
      console.log('❌ Nenhuma pesquisa ativa encontrada');
      return;
    }
    
    const survey = surveys[0];
    console.log(`📋 Usando pesquisa: ${survey.title} (${survey.id})`);
    
    const { data: generateResult, error: generateError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        email: 'teste@exemplo.com',
        surveyId: survey.id
      },
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    });
    
    if (generateError) {
      console.error('❌ Erro ao gerar magic link:', generateError);
      return;
    }
    
    console.log('✅ Magic link gerado:', generateResult);
    
    // Extrair token da URL
    const magicLinkUrl = generateResult.data.magicLinkUrl;
    const token = new URL(magicLinkUrl).searchParams.get('token');
    
    if (!token) {
      console.error('❌ Token não encontrado na URL');
      return;
    }
    
    console.log(`🔑 Token extraído: ${token.substring(0, 8)}...`);
    
    // 2. Testar validação do token
    console.log('\n2️⃣ Validando token...');
    const { data: validateResult, error: validateError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'validate',
        token: token
      },
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    });
    
    if (validateError) {
      console.error('❌ Erro ao validar token:', validateError);
      return;
    }
    
    console.log('✅ Validação bem-sucedida:', validateResult);
    
    // 3. Testar uso do token (autenticação)
    console.log('\n3️⃣ Usando token para autenticação...');
    const { data: useResult, error: useError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'use',
        token: token
      },
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    });
    
    if (useError) {
      console.error('❌ Erro ao usar token:', useError);
      return;
    }
    
    console.log('✅ Autenticação bem-sucedida:', useResult);
    
    // 4. Testar acesso aos dados da pesquisa com a sessão criada
    console.log('\n4️⃣ Testando acesso aos dados da pesquisa...');
    
    // Criar cliente com a sessão do usuário autenticado
    const userSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${useResult.data.session.access_token}`
        }
      }
    });
    
    // Testar busca da pesquisa
    const { data: surveyData, error: surveyError } = await userSupabase
      .from('surveys')
      .select('id, title, description, status, current_responses, max_responses')
      .eq('id', survey.id)
      .single();
    
    if (surveyError) {
      console.error('❌ Erro ao buscar pesquisa com sessão do usuário:', surveyError);
    } else {
      console.log('✅ Pesquisa acessada com sucesso:', surveyData);
    }
    
    // Testar busca das questões
    const { data: questionsData, error: questionsError } = await userSupabase
      .from('questions')
      .select('id, question_text, question_type, options, question_order')
      .eq('survey_id', survey.id)
      .order('question_order', { ascending: true });
    
    if (questionsError) {
      console.error('❌ Erro ao buscar questões com sessão do usuário:', questionsError);
    } else {
      console.log(`✅ Questões acessadas com sucesso: ${questionsData?.length || 0} questões`);
    }
    
    console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

testMagicLinkValidation();