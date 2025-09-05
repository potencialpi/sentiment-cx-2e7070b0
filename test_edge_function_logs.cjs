const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 TESTE DE LOGS DA EDGE FUNCTION');
console.log('=' .repeat(50));

async function testEdgeFunctionLogs() {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('\n🧪 TESTANDO EDGE FUNCTION COM DADOS SIMPLES:');
    
    // Teste 1: Ação inválida para ver se a função responde
    console.log('\n1️⃣ Testando com ação inválida:');
    try {
      const { data: invalidResult, error: invalidError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'invalid_action'
        }
      });
      
      if (invalidError) {
        console.log('❌ Erro esperado:', invalidError.message);
        console.log('Status:', invalidError.context?.status);
      } else {
        console.log('✅ Resposta:', invalidResult);
      }
    } catch (error) {
      console.log('💥 Erro capturado:', error.message);
    }

    // Teste 2: Dados mínimos para generate
    console.log('\n2️⃣ Testando geração com dados mínimos:');
    try {
      const { data: generateResult, error: generateError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'generate',
          email: 'test@example.com',
          surveyId: 'test-survey-id'
        }
      });
      
      if (generateError) {
        console.log('❌ Erro na geração:', generateError.message);
        console.log('Status:', generateError.context?.status);
        console.log('Headers:', generateError.context?.headers);
      } else {
        console.log('✅ Resposta da geração:', generateResult);
      }
    } catch (error) {
      console.log('💥 Erro capturado na geração:', error.message);
    }

    // Teste 3: Verificar se conseguimos acessar as tabelas
    console.log('\n3️⃣ Testando acesso às tabelas:');
    
    // Testar tabela surveys
    try {
      const { data: surveys, error: surveysError } = await supabase
        .from('surveys')
        .select('id, title, status')
        .limit(1);
      
      if (surveysError) {
        console.log('❌ Erro ao acessar surveys:', surveysError.message);
      } else {
        console.log('✅ Surveys acessíveis:', surveys?.length || 0, 'registros');
        if (surveys && surveys.length > 0) {
          console.log('Primeira survey:', surveys[0]);
        }
      }
    } catch (error) {
      console.log('💥 Erro ao acessar surveys:', error.message);
    }

    // Testar tabela magic_links
    try {
      const { data: magicLinks, error: magicLinksError } = await supabase
        .from('magic_links')
        .select('id, email, survey_id, created_at')
        .limit(1);
      
      if (magicLinksError) {
        console.log('❌ Erro ao acessar magic_links:', magicLinksError.message);
      } else {
        console.log('✅ Magic_links acessível:', magicLinks?.length || 0, 'registros');
      }
    } catch (error) {
      console.log('💥 Erro ao acessar magic_links:', error.message);
    }

    // Teste 4: Verificar variáveis de ambiente na Edge Function
    console.log('\n4️⃣ Testando Edge Function com OPTIONS (CORS):');
    try {
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/magic-link`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status OPTIONS:', response.status);
      console.log('Headers OPTIONS:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        console.log('✅ CORS funcionando');
      } else {
        console.log('❌ CORS com problema');
      }
    } catch (error) {
      console.log('💥 Erro no teste CORS:', error.message);
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL NO TESTE:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar teste
testEdgeFunctionLogs().then(() => {
  console.log('\n🎯 TESTE DE LOGS CONCLUÍDO!');
}).catch(error => {
  console.error('💥 Erro fatal:', error);
});