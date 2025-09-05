require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFrontendFlow() {
  console.log('🧪 Testando fluxo completo do frontend...');
  
  const testEmail = 'test@example.com';
  const surveyId = 'd813cf8d-c1bf-41a3-a425-60bb80a9d947'; // ID da survey existente
  
  try {
    // 1. Gerar magic link
    console.log('\n1. Gerando magic link...');
    const { data: generateResult, error: generateError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        email: testEmail,
        surveyId: surveyId
      }
    });
    
    console.log('Raw response:', { generateResult, generateError });
    
    if (generateError) {
      console.error('Generate Error Details:', {
        message: generateError.message,
        details: generateError.details,
        hint: generateError.hint,
        code: generateError.code
      });
      throw new Error(`Erro ao gerar: ${generateError.message}`);
    }
    
    if (!generateResult || !generateResult.success) {
      console.error('Generate Result:', generateResult);
      throw new Error(`Falha ao gerar: ${generateResult?.error || 'Resposta inválida'}`);
    }
    
    // Extrair token da URL do magic link
    const magicLinkUrl = generateResult.data.magicLinkUrl;
    const urlParams = new URLSearchParams(magicLinkUrl.split('?')[1]);
    const token = urlParams.get('token');
    
    console.log('✅ Magic link gerado com sucesso');
    console.log(`Token: ${token.substring(0, 20)}...`);
    console.log(`URL: ${magicLinkUrl}`);
    
    // 2. Simular acesso via URL (validação)
    console.log('\n2. Simulando acesso via URL (validação)...');
    const { data: validateResult, error: validateError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'validate',
        token: token
      }
    });
    
    if (validateError) {
      throw new Error(`Erro na validação: ${validateError.message}`);
    }
    
    if (!validateResult.success) {
      throw new Error(`Falha na validação: ${validateResult.error}`);
    }
    
    console.log('✅ Token validado com sucesso');
    console.log(`Email: ${validateResult.data.email}`);
    console.log(`Survey: ${validateResult.data.surveyTitle}`);
    
    // 3. Simular autenticação (uso do token)
    console.log('\n3. Simulando autenticação (uso do token)...');
    const { data: useResult, error: useError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'use',
        token: token
      }
    });
    
    if (useError) {
      throw new Error(`Erro na autenticação: ${useError.message}`);
    }
    
    if (!useResult.success) {
      throw new Error(`Falha na autenticação: ${useResult.error}`);
    }
    
    console.log('✅ Autenticação realizada com sucesso');
    console.log('Dados de autenticação:', useResult.data);
    
    if (useResult.data.user) {
      console.log(`Usuário: ${useResult.data.user.email}`);
    }
    console.log(`Sessão criada: ${useResult.data.session ? 'Sim' : 'Não'}`);
    
    console.log('\n🎉 Teste do fluxo frontend concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    // Tentar verificar se a survey existe
    console.log('\n🔍 Verificando se a survey existe...');
    try {
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();
      
      if (surveyError) {
        console.log('❌ Survey não encontrada:', surveyError.message);
      } else {
        console.log('✅ Survey encontrada:', survey.title);
      }
    } catch (surveyCheckError) {
      console.log('❌ Erro ao verificar survey:', surveyCheckError.message);
    }
    
    process.exit(1);
  }
}

testFrontendFlow();