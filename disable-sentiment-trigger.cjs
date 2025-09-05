require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableSentimentTrigger() {
  console.log('🔧 Desabilitando trigger de análise de sentimento temporariamente...');
  
  try {
    // Tentar desabilitar o trigger usando SQL direto
    const { data, error } = await supabase
      .from('responses')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao conectar com Supabase:', error);
      return;
    }
    
    console.log('✅ Conexão com Supabase estabelecida');
    
    // Como não podemos executar SQL diretamente, vamos tentar uma abordagem diferente
    // Vamos testar se o trigger ainda está causando problemas
    console.log('\n🧪 Testando se o erro 22023 ainda persiste...');
    
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id')
      .limit(1);
    
    if (surveys && surveys.length > 0) {
      const testResponse = {
        survey_id: surveys[0].id,
        respondent_id: '00000000-0000-0000-0000-000000000001',
        responses: [
          "Este é um teste para verificar se o erro 22023 ainda persiste."
        ]
      };
      
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert(testResponse)
        .select()
        .single();
      
      if (responseError) {
        if (responseError.code === '22023') {
          console.error('❌ ERRO 22023 CONFIRMADO:', responseError.message);
          console.log('\n💡 SOLUÇÕES RECOMENDADAS:');
          console.log('1. Acessar o Supabase Dashboard > SQL Editor');
          console.log('2. Executar: DROP TRIGGER IF EXISTS sentiment_analysis_trigger ON responses;');
          console.log('3. Ou configurar as variáveis app.supabase_url e app.supabase_service_role_key no banco');
          console.log('\n🔗 Link direto: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql');
        } else {
          console.error('❌ Outro erro encontrado:', responseError);
        }
      } else {
        console.log('✅ SUCESSO! Resposta inserida sem erro 22023');
        console.log('   ID da resposta:', response.id);
        
        // Limpar o teste
        await supabase.from('responses').delete().eq('id', response.id);
        console.log('🧹 Resposta de teste removida');
      }
    } else {
      console.log('❌ Nenhum survey encontrado para teste');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

disableSentimentTrigger().catch(console.error);