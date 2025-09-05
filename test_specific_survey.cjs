const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 TESTE COM SURVEY ESPECÍFICA');
console.log('=' .repeat(50));

async function testSpecificSurvey() {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Usar o ID da survey que sabemos que existe
    const surveyId = 'd813cf8d-c1bf-41a3-a425-60bb80a9d947';
    const testEmail = 'test@example.com';

    console.log('\n🧪 TESTANDO GERAÇÃO DE MAGIC LINK:');
    console.log('Survey ID:', surveyId);
    console.log('Email:', testEmail);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'generate',
          email: testEmail,
          surveyId: surveyId
        }
      });
      
      if (error) {
        console.log('❌ Erro na Edge Function:');
        console.log('- Message:', error.message);
        console.log('- Status:', error.context?.status);
        console.log('- StatusText:', error.context?.statusText);
        console.log('- Headers:', error.context?.headers ? Object.fromEntries(error.context.headers.entries()) : 'N/A');
        
        // Tentar ler o corpo da resposta de erro
        if (error.context?.body) {
          try {
            const errorBody = await error.context.body.text();
            console.log('- Body:', errorBody);
          } catch (bodyError) {
            console.log('- Body: Não foi possível ler o corpo da resposta');
          }
        }
      } else {
        console.log('✅ Sucesso na geração:');
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.log('💥 Erro capturado:', error.message);
      console.log('Stack:', error.stack);
    }

    // Teste adicional: verificar se conseguimos acessar a survey diretamente
    console.log('\n🔍 VERIFICANDO ACESSO DIRETO À SURVEY:');
    try {
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('id, title, user_id, status')
        .eq('id', surveyId)
        .single();
      
      if (surveyError) {
        console.log('❌ Erro ao acessar survey:', surveyError.message);
      } else {
        console.log('✅ Survey encontrada:', survey);
      }
    } catch (error) {
      console.log('💥 Erro ao acessar survey:', error.message);
    }

    // Teste adicional: verificar se conseguimos inserir na tabela magic_links
    console.log('\n🔗 TESTANDO INSERÇÃO DIRETA NA TABELA MAGIC_LINKS:');
    try {
      const testToken = 'test_token_' + Date.now();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const { data: magicLink, error: insertError } = await supabase
        .from('magic_links')
        .insert({
          email: testEmail,
          token: testToken,
          survey_id: surveyId,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.log('❌ Erro ao inserir magic link:', insertError.message);
        console.log('Detalhes:', insertError);
      } else {
        console.log('✅ Magic link inserido com sucesso:', magicLink.id);
        
        // Limpar o teste
        await supabase
          .from('magic_links')
          .delete()
          .eq('id', magicLink.id);
        console.log('🧹 Registro de teste removido');
      }
    } catch (error) {
      console.log('💥 Erro na inserção:', error.message);
    }

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar teste
testSpecificSurvey().then(() => {
  console.log('\n🎯 TESTE ESPECÍFICO CONCLUÍDO!');
}).catch(error => {
  console.error('💥 Erro fatal:', error);
});