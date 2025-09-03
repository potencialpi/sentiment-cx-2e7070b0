-- Update Start Quântico plan survey limit to 2 per month
-- This migration updates the validate_survey_limits function to set max_surveys to 2 for start-quantico plan

CREATE OR REPLACE FUNCTION validate_survey_limits()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_surveys INTEGER;
    user_plan TEXT;
    current_month_start DATE;
BEGIN
    -- Get user's plan from profiles table
    SELECT plan_name INTO user_plan
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Set survey limits based on plan
    CASE user_plan
        WHEN 'start-quantico' THEN
            max_surveys := 2;
        WHEN 'vortex-neural' THEN
            max_surveys := 4;
        WHEN 'nexus-infinito' THEN
            max_surveys := NULL; -- Unlimited
        ELSE
            max_surveys := 2; -- Default to Start Quântico limit
    END CASE;
    
    -- Skip validation for unlimited plans
    IF max_surveys IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calculate current month start
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    
    -- Count current surveys for this user in the current month
    SELECT COUNT(*) INTO current_count
    FROM surveys
    WHERE user_id = NEW.user_id
    AND created_at >= current_month_start
    AND created_at < current_month_start + INTERVAL '1 month';
    
    -- Check if adding this survey would exceed the limit
    IF current_count >= max_surveys THEN
        RAISE EXCEPTION 'Survey limit exceeded. Plan % allows maximum % surveys per month', user_plan, max_surveys;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS check_survey_limits ON surveys;
CREATE TRIGGER check_survey_limits
    BEFORE INSERT ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION validate_survey_limits();