-- Inserir sessão de checkout de teste para validar o fluxo
-- Esta sessão simula uma compra válida do Stripe

INSERT INTO checkout_sessions (
  stripe_session_id,
  email,
  status,
  amount,
  currency,
  expires_at,
  created_at,
  updated_at
) VALUES (
  'cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  'teste@exemplo.com',
  'pending',
  2997,
  'brl',
  CURRENT_TIMESTAMP + INTERVAL '24 hours',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Verificar se a inserção foi bem-sucedida
SELECT 
  stripe_session_id,
  email,
  status,
  amount,
  currency,
  expires_at,
  created_at
FROM checkout_sessions 
WHERE stripe_session_id = 'cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n