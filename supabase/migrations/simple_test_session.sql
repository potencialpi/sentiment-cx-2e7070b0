-- Inserir sessão de teste completa
INSERT INTO checkout_sessions (
  stripe_session_id, 
  email, 
  company_name, 
  password_hash, 
  plan_id, 
  billing_type, 
  amount, 
  currency, 
  status, 
  phone_number
) VALUES (
  'cs_test_987654321', 
  'novoteste@exemplo.com', 
  'Empresa Teste Ltda', 
  '$2b$10$abcdefghijklmnopqrstuvwxyz123456789', 
  'pro_monthly', 
  'monthly', 
  2997, 
  'BRL', 
  'pending', 
  '+5511999999999'
);