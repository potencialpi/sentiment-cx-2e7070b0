-- Debug checkout sessions data
SELECT 
  stripe_session_id,
  email,
  status,
  created_at
FROM checkout_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- Count pending sessions
SELECT COUNT(*) as total_pending
FROM checkout_sessions 
WHERE status = 'pending';

-- Count completed sessions
SELECT COUNT(*) as total_completed
FROM checkout_sessions