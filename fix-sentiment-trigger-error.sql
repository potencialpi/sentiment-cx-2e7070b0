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

-- Log da correção
RAISE NOTICE 'Sentiment analysis trigger fixed to handle missing configurations and prevent error 22023';