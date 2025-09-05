const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMagicLinkAuth() {
  console.log('🔍 Testando autenticação via magic link...');
  
  try {
    // 1. Buscar uma pesquisa existente
    console.log('\n1. Buscando pesquisa existente...');
    const { data: surveys, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title')
      .eq('status', 'active')
      .limit(1);
    
    if (surveyError) {
      console.error('❌ Erro ao buscar pesquisas:', surveyError.message);
      return;
    }
    
    if (!surveys || surveys.length === 0) {
      console.log('⚠️ Nenhuma pesquisa ativa encontrada');
      return;
    }
    
    const survey = surveys[0];
    console.log(`✅ Pesquisa encontrada: ${survey.title} (ID: ${survey.id})`);
    
    // 2. Gerar magic link
    console.log('\n2. Gerando magic link...');
    const testEmail = 'test@example.com';
    
    const { data: functionData, error: functionError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        surveyId: survey.id,
        email: testEmail
      }
    });
    
    if (functionError) {
      console.error('❌ Erro na Edge Function:', functionError.message);
      return;
    }
    
    console.log('✅ Magic link gerado:', functionData);
    
    // 3. Verificar se o token foi criado
    console.log('\n3. Verificando token no banco...');
    const { data: tokens, error: tokenError } = await supabase
      .from('magic_links')
      .select('*')
      .eq('survey_id', survey.id)
      .eq('email', testEmail)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (tokenError) {
      console.error('❌ Erro ao verificar token:', tokenError.message);
      return;
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('❌ Token não encontrado no banco');
      return;
    }
    
    const token = tokens[0];
    console.log(`✅ Token encontrado: ${token.token}`);
    
    // 4. Testar validação do token
    console.log('\n4. Testando validação do token...');
    const { data: validateData, error: validateError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'validate',
        token: token.token
      }
    });
    
    if (validateError) {
      console.error('❌ Erro na validação:', validateError.message);
      return;
    }
    
    console.log('✅ Validação do token:', validateData);
    
    // 5. Testar uso do token (autenticação)
    console.log('\n5. Testando uso do token...');
    const { data: useData, error: useError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'use',
        token: token.token
      }
    });
    
    if (useError) {
      console.error('❌ Erro no uso do token:', useError.message);
      return;
    }
    
    console.log('✅ Uso do token:', useData);
    
    // 6. Verificar se o token foi marcado como usado
    console.log('\n6. Verificando se token foi marcado como usado...');
    const { data: usedTokens, error: usedError } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token', token.token);
    
    if (usedError) {
      console.error('❌ Erro ao verificar token usado:', usedError.message);
      return;
    }
    
    if (usedTokens && usedTokens.length > 0) {
      const usedToken = usedTokens[0];
      console.log(`✅ Status do token: ${usedToken.used_at ? 'Usado' : 'Não usado'}`);
      if (usedToken.used_at) {
        console.log(`✅ Usado em: ${usedToken.used_at}`);
      }
    }
    
    console.log('\n🎉 Teste de autenticação via magic link concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMagicLinkAuth();