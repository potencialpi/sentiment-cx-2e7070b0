require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verificando variáveis de ambiente:');
console.log('   VITE_SUPABASE_URL:', supabaseUrl ? 'Definida' : 'Não encontrada');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Definida' : 'Não encontrada');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTriggerDirect() {
  console.log('🔧 Aplicando correção do trigger de análise de sentimento via RPC...');
  
  const fixQuery = `
-- Fix para o erro 22023 no trigger de análise de sentimento
-- Este erro ocorre quando current_setting() tenta acessar configurações que não existem

-- Recriar a função com tratamento de erro para configurações ausentes
CREATE OR REPLACE FUNCTION trigger_sentiment_analysis()
RETURNS TRIGGER AS $$
DECLARE
    text_responses TEXT[];
    response_text TEXT;
    question_data JSONB;
    supabase_url TEXT;
    service_role_key TEXT;
BEGIN
    -- Verificar se as configurações necessárias existem
    BEGIN
        supabase_url := current_setting('app.supabase_url', true);
        service_role_key := current_setting('app.supabase_service_role_key', true);
    EXCEPTION
        WHEN OTHERS THEN
            -- Se as configurações não existem, apenas retornar sem fazer nada
            RAISE NOTICE 'Sentiment analysis skipped: missing configuration settings';
            RETURN NEW;
    END;
    
    -- Se as configurações estão vazias ou nulas, pular a análise
    IF supabase_url IS NULL OR supabase_url = '' OR 
       service_role_key IS NULL OR service_role_key = '' THEN
        RAISE NOTICE 'Sentiment analysis skipped: empty configuration settings';
        RETURN NEW;
    END IF;
    
    -- Extract text responses from the responses JSONB
    text_responses := ARRAY[]::TEXT[];
    
    -- Verificar se NEW.responses é válido
    IF NEW.responses IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Iterate through the responses JSONB to find text answers
    BEGIN
        FOR question_data IN SELECT jsonb_array_elements(NEW.responses::jsonb)
        LOOP
            -- Check if the response is a text (not a number or short answer)
            response_text := question_data::text;
            
            -- Remove quotes and check if it's a meaningful text response
            response_text := trim(both '"' from response_text);
            
            -- Only include responses that are longer than 10 characters and contain letters
            IF length(response_text) > 10 AND response_text ~ '[a-zA-ZÀ-ÿ]' THEN
                text_responses := array_append(text_responses, response_text);
            END IF;
        END LOOP;
    EXCEPTION
        WHEN OTHERS THEN
            -- Se houver erro ao processar as respostas, apenas retornar
            RAISE NOTICE 'Error processing responses for sentiment analysis: %', SQLERRM;
            RETURN NEW;
    END;
    
    -- If we have text responses, trigger the sentiment analysis
    IF array_length(text_responses, 1) > 0 THEN
        -- Use pg_net to call the Edge Function asynchronously
        BEGIN
            PERFORM
                net.http_post(
                    url := supabase_url || '/functions/v1/analyze-sentiment',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || service_role_key
                    ),
                    body := jsonb_build_object(
                        'responseId', NEW.id,
                        'texts', text_responses
                    )
                );
        EXCEPTION
            WHEN OTHERS THEN
                -- Se houver erro na chamada HTTP, apenas logar e continuar
                RAISE NOTICE 'Error calling sentiment analysis: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger
DROP TRIGGER IF EXISTS sentiment_analysis_trigger ON responses;
CREATE TRIGGER sentiment_analysis_trigger
    AFTER INSERT ON responses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sentiment_analysis();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_sentiment_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_sentiment_analysis() TO anon;

-- Add comment
COMMENT ON FUNCTION trigger_sentiment_analysis() IS 'Fixed version: Automatically triggers sentiment analysis for new responses with proper error handling';
COMMENT ON TRIGGER sentiment_analysis_trigger ON responses IS 'Fixed version: Calls sentiment analysis Edge Function with error handling when new responses are inserted';
  `;
  
  try {
    // Executar o SQL diretamente
    const { data, error } = await supabase.rpc('exec_sql', { sql: fixQuery });
    
    if (error) {
      console.error('❌ Erro ao aplicar correção:', error);
      
      // Tentar abordagem alternativa: executar cada comando separadamente
      console.log('\n🔄 Tentando abordagem alternativa...');
      
      // Primeiro, criar a função
      const createFunctionQuery = `
CREATE OR REPLACE FUNCTION trigger_sentiment_analysis()
RETURNS TRIGGER AS $$
DECLARE
    text_responses TEXT[];
    response_text TEXT;
    question_data JSONB;
    supabase_url TEXT;
    service_role_key TEXT;
BEGIN
    -- Verificar se as configurações necessárias existem
    BEGIN
        supabase_url := current_setting('app.supabase_url', true);
        service_role_key := current_setting('app.supabase_service_role_key', true);
    EXCEPTION
        WHEN OTHERS THEN
            -- Se as configurações não existem, apenas retornar sem fazer nada
            RAISE NOTICE 'Sentiment analysis skipped: missing configuration settings';
            RETURN NEW;
    END;
    
    -- Se as configurações estão vazias ou nulas, pular a análise
    IF supabase_url IS NULL OR supabase_url = '' OR 
       service_role_key IS NULL OR service_role_key = '' THEN
        RAISE NOTICE 'Sentiment analysis skipped: empty configuration settings';
        RETURN NEW;
    END IF;
    
    -- Extract text responses from the responses JSONB
    text_responses := ARRAY[]::TEXT[];
    
    -- Verificar se NEW.responses é válido
    IF NEW.responses IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Iterate through the responses JSONB to find text answers
    BEGIN
        FOR question_data IN SELECT jsonb_array_elements(NEW.responses::jsonb)
        LOOP
            -- Check if the response is a text (not a number or short answer)
            response_text := question_data::text;
            
            -- Remove quotes and check if it's a meaningful text response
            response_text := trim(both '"' from response_text);
            
            -- Only include responses that are longer than 10 characters and contain letters
            IF length(response_text) > 10 AND response_text ~ '[a-zA-ZÀ-ÿ]' THEN
                text_responses := array_append(text_responses, response_text);
            END IF;
        END LOOP;
    EXCEPTION
        WHEN OTHERS THEN
            -- Se houver erro ao processar as respostas, apenas retornar
            RAISE NOTICE 'Error processing responses for sentiment analysis: %', SQLERRM;
            RETURN NEW;
    END;
    
    -- If we have text responses, trigger the sentiment analysis
    IF array_length(text_responses, 1) > 0 THEN
        -- Use pg_net to call the Edge Function asynchronously
        BEGIN
            PERFORM
                net.http_post(
                    url := supabase_url || '/functions/v1/analyze-sentiment',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || service_role_key
                    ),
                    body := jsonb_build_object(
                        'responseId', NEW.id,
                        'texts', text_responses
                    )
                );
        EXCEPTION
            WHEN OTHERS THEN
                -- Se houver erro na chamada HTTP, apenas logar e continuar
                RAISE NOTICE 'Error calling sentiment analysis: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      const { error: funcError } = await supabase.rpc('exec_sql', { sql: createFunctionQuery });
      
      if (funcError) {
        console.error('❌ Erro ao criar função:', funcError);
        return;
      }
      
      console.log('✅ Função criada com sucesso!');
      
      // Agora recriar o trigger
      const triggerQuery = `
DROP TRIGGER IF EXISTS sentiment_analysis_trigger ON responses;
CREATE TRIGGER sentiment_analysis_trigger
    AFTER INSERT ON responses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sentiment_analysis();
      `;
      
      const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggerQuery });
      
      if (triggerError) {
        console.error('❌ Erro ao criar trigger:', triggerError);
        return;
      }
      
      console.log('✅ Trigger recriado com sucesso!');
      
    } else {
      console.log('✅ Correção aplicada com sucesso!');
    }
    
    console.log('\n🧪 Testando se o erro 22023 foi corrigido...');
    
    // Testar inserindo uma resposta
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id')
      .limit(1);
    
    if (surveys && surveys.length > 0) {
      const testResponse = {
        survey_id: surveys[0].id,
        respondent_id: '00000000-0000-0000-0000-000000000001',
        responses: [
          "Este é um teste para verificar se o erro 22023 foi corrigido no trigger de análise de sentimento."
        ]
      };
      
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert(testResponse)
        .select()
        .single();
      
      if (responseError) {
        if (responseError.code === '22023') {
          console.error('❌ ERRO 22023 AINDA PERSISTE:', responseError);
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
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixTriggerDirect().catch(console.error);