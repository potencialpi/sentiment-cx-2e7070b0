const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔐 TESTE DE VALIDAÇÃO DO MAGIC LINK');
console.log('=' .repeat(50));

async function testMagicLinkValidation() {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const surveyId = 'd813cf8d-c1bf-41a3-a425-60bb80a9d947';
    const testEmail = 'validation-test@example.com';

    console.log('\n1️⃣ GERANDO NOVO MAGIC LINK:');
    const { data: generateResult, error: generateError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        email: testEmail,
        surveyId: surveyId
      }
    });
    
    if (generateError) {
      console.log('❌ Erro na geração:', generateError.message);
      return;
    }
    
    console.log('✅ Magic link gerado:');
    console.log('URL:', generateResult.data.magicLinkUrl);
    
    // Extrair o token da URL
    const url = new URL(generateResult.data.magicLinkUrl);
    const token = url.searchParams.get('token');
    const urlSurveyId = url.searchParams.get('surveyId');
    
    console.log('Token extraído:', token);
    console.log('Survey ID extraído:', urlSurveyId);

    console.log('\n2️⃣ VALIDANDO O MAGIC LINK:');
    const { data: validateResult, error: validateError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'validate',
        token: token,
        surveyId: urlSurveyId
      }
    });
    
    if (validateError) {
      console.log('❌ Erro na validação:', validateError.message);
      console.log('Status:', validateError.context?.status);
      console.log('StatusText:', validateError.context?.statusText);
    } else {
      console.log('✅ Validação bem-sucedida:');
      console.log(JSON.stringify(validateResult, null, 2));
    }

    console.log('\n3️⃣ USANDO O MAGIC LINK (MARCAR COMO USADO):');
    const { data: useResult, error: useError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'use',
        token: token,
        surveyId: urlSurveyId
      }
    });
    
    if (useError) {
      console.log('❌ Erro ao usar:', useError.message);
      console.log('Status:', useError.context?.status);
      console.log('StatusText:', useError.context?.statusText);
    } else {
      console.log('✅ Magic link usado com sucesso:');
      console.log(JSON.stringify(useResult, null, 2));
    }

    console.log('\n4️⃣ TENTANDO USAR NOVAMENTE (DEVE FALHAR):');
    const { data: useAgainResult, error: useAgainError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'use',
        token: token,
        surveyId: urlSurveyId
      }
    });
    
    if (useAgainError) {
      console.log('✅ Erro esperado ao tentar usar novamente:', useAgainError.message);
    } else {
      console.log('❌ PROBLEMA: Magic link foi usado novamente quando não deveria!');
      console.log(JSON.stringify(useAgainResult, null, 2));
    }

    console.log('\n5️⃣ VERIFICANDO ESTADO FINAL DO MAGIC LINK:');
    const { data: finalState, error: finalError } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .single();
    
    if (finalError) {
      console.log('❌ Erro ao verificar estado final:', finalError.message);
    } else {
      console.log('✅ Estado final do magic link:');
      console.log('- ID:', finalState.id);
      console.log('- Email:', finalState.email);
      console.log('- Usado em:', finalState.used_at);
      console.log('- Expira em:', finalState.expires_at);
      console.log('- Status usado:', finalState.used_at ? 'SIM' : 'NÃO');
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar teste
testMagicLinkValidation().then(() => {
  console.log('\n🎯 TESTE DE VALIDAÇÃO CONCLUÍDO!');
}).catch(error => {
  console.error('💥 Erro fatal:', error);
});