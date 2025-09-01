require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'OK' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMagicLinkGeneration() {
  console.log('🔍 TESTANDO GERAÇÃO DE MAGIC LINK\n');
  
  try {
    // Buscar qualquer pesquisa existente para usar no teste
    const { data: surveys, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title')
      .limit(1);
    
    if (surveyError) {
      console.error('❌ Erro ao buscar pesquisas:', surveyError.message);
      return;
    }
    
    if (!surveys || surveys.length === 0) {
      console.log('❌ Nenhuma pesquisa encontrada no banco de dados.');
      return;
    }
    
    const surveyId = surveys[0].id;
    const testEmail = 'teste@exemplo.com';
    
    console.log(`📋 Usando pesquisa: ${surveys[0].title} (${surveyId})`);
    console.log(`📧 Email de teste: ${testEmail}\n`);
    
    // Testar geração de magic link
    console.log('🚀 Chamando Edge Function para gerar magic link...');
    
    const { data: result, error: functionError } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        email: testEmail,
        surveyId: surveyId
      }
    });
    
    if (functionError) {
      console.error('❌ ERRO NA EDGE FUNCTION:', functionError);
      console.error('Detalhes:', JSON.stringify(functionError, null, 2));
      return;
    }
    
    console.log('✅ RESPOSTA DA EDGE FUNCTION:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result && result.success) {
      console.log('\n🎉 MAGIC LINK GERADO COM SUCESSO!');
      console.log('📧 Email:', result.data.email);
      console.log('🔗 Token gerado:', result.data.token ? 'SIM' : 'NÃO');
      console.log('⏰ Expira em:', result.data.expiresAt);
    } else {
      console.log('\n❌ FALHA NA GERAÇÃO DO MAGIC LINK');
      console.log('Erro:', result?.error || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
testMagicLinkGeneration()
  .then(() => {
    console.log('\n✅ Teste concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  });