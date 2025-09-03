-- Debug checkout sessions
SELECT 
  stripe_session_id,
  email,
  status,
  created_at,
  expires_at
FROM checkout_sessions 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for pending sessions
SELECT COUNT(*) as pending_sessions
FROM checkout_sessions 
WHERE status = 'pending';
-- Check for expired sessions
SELECT COUNT(*) as expired_sessions
FROM checkout_sessions 
WHERE expires_at < NOW();