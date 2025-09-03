-- Check existing surveys
SELECT 
  id as survey_id,
  title,
  current_responses
FROM surveys
ORDER BY created_at DESC
LIMIT 5;

-- Check sample responses with text data
SELECT 
  id,
  survey_id,
  responses,
  sentiment_score,
  sentiment_category
FROM responses
LIMIT 3;