-- Verificar usuários com plano nexus-infinito
SELECT 
  p.id,
  p.user_id,
  p.plan_name,
  p.plan_type,
  p.subscription_status,
  p.email
FROM profiles p
WHERE p.plan_name = 'nexus-infinito' OR p.plan_type = 'nexus-infinito';

-- Verificar empresas com plano nexus-infinito
SELECT 
  c.id,
  c.user_id,
  c.company_name,
  c.plan_name
FROM companies c
WHERE c.plan_name = 'nexus-infinito';

-- Verificar pesquisas de usuários nexus-infinito
SELECT 
  s.id as survey_id,
  s.title,
  s.user_id,
  p.plan_name,
  s.current_responses,
  s.status
FROM surveys s
JOIN profiles p ON s.user_id = p.user_id
WHERE p.plan_name = 'nexus-infinito' OR p.plan_type = 'nexus-infinito';

-- Verificar respostas de pesquisas de usuários nexus-infinito
SELECT 
  r.id as response_id,
  r.survey_id,
  r.sentiment_score,
  r.sentiment_category,
  s.title as survey_title,
  p.plan_name
FROM responses r
JOIN surveys s ON r.survey_id = s.id
JOIN profiles p ON s.user_id = p.user_id
WHERE p.plan_name = 'nexus-infinito' OR p.plan_type = 'nexus-infinito';