-- Migration: Add automatic sentiment analysis trigger
-- This trigger will automatically call the analyze-sentiment Edge Function when a new response is inserted

-- Create function to trigger sentiment analysis
CREATE OR REPLACE FUNCTION trigger_sentiment_analysis()
RETURNS TRIGGER AS $$
DECLARE
    text_responses TEXT[];
    response_text TEXT;
    question_data JSONB;
BEGIN
    -- Extract text responses from the responses JSONB
    text_responses := ARRAY[]::TEXT[];
    
    -- Iterate through the responses JSONB to find text answers
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
    
    -- If we have text responses, trigger the sentiment analysis
    IF array_length(text_responses, 1) > 0 THEN
        -- Use pg_net to call the Edge Function asynchronously
        PERFORM
            net.http_post(
                url := current_setting('app.supabase_url') || '/functions/v1/analyze-sentiment',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
                ),
                body := jsonb_build_object(
                    'responseId', NEW.id,
                    'texts', text_responses
                )
            );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS sentiment_analysis_trigger ON responses;
CREATE TRIGGER sentiment_analysis_trigger
    AFTER INSERT ON responses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sentiment_analysis();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_sentiment_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_sentiment_analysis() TO anon;

-- Add comment
COMMENT ON FUNCTION trigger_sentiment_analysis() IS 'Automatically triggers sentiment analysis for new responses with text content';
COMMENT ON TRIGGER sentiment_analysis_trigger ON responses IS 'Calls sentiment analysis Edge Function when new responses are inserted';