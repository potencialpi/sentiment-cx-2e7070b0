const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testMagicLinkFunction() {
  console.log('🧪 Testando função magic-link...');
  console.log('📍 URL:', process.env.VITE_SUPABASE_URL);
  console.log('🔑 Anon Key exists:', !!process.env.VITE_SUPABASE_ANON_KEY);
  
  try {
    // Teste 1: Ação inválida (deve retornar 400)
    console.log('\n🔍 Teste 1: Ação inválida');
    const result1 = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'invalid_action'
      }
    });
    console.log('Status:', result1.error?.context?.status || 'success');
    console.log('Resposta:', result1.data || result1.error?.message);
    
    // Teste 2: Validar token inexistente (deve retornar 401)
    console.log('\n🔍 Teste 2: Token inexistente');
    const result2 = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'validate',
        token: 'token_inexistente_123'
      }
    });
    console.log('Status:', result2.error?.context?.status || 'success');
    console.log('Resposta:', result2.data || result2.error?.message);
    
    // Teste 3: Gerar magic link (precisa de email e surveyId válidos)
    console.log('\n🔍 Teste 3: Gerar magic link');
    const result3 = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        email: 'teste@exemplo.com',
        surveyId: 'survey_id_teste'
      }
    });
    console.log('Status:', result3.error?.context?.status || 'success');
    console.log('Resposta:', result3.data || result3.error?.message);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testMagicLinkFunction();