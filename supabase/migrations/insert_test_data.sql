-- Create a test user first (insert into auth.users if it doesn't exist)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
VALUES (
  '12345678-abcd-1234-abcd-123456789abc',
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  '$2a$10$test.encrypted.password.hash',
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Insert test survey (using valid UUIDs)
INSERT INTO surveys (id, user_id, title, description, unique_link, max_responses, current_responses, status, created_at, updated_at)
VALUES (
  '12345678-1234-1234-1234-123456789abc',
  '12345678-abcd-1234-abcd-123456789abc',
  'Pesquisa de Satisfação - Teste',
  'Pesquisa para testar análise de sentimento',
  'test-survey-link',
  100,
  20,
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert test questions
INSERT INTO questions (id, survey_id, question_text, question_type, options, question_order, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '12345678-1234-1234-1234-123456789abc', 'Como você avalia nosso atendimento?', 'rating', '["1", "2", "3", "4", "5"]', 1, NOW()),
  ('22222222-2222-2222-2222-222222222222', '12345678-1234-1234-1234-123456789abc', 'O que você achou do nosso produto?', 'text', '[]', 2, NOW()),
  ('33333333-3333-3333-3333-333333333333', '12345678-1234-1234-1234-123456789abc', 'Recomendaria nossos serviços?', 'rating', '["1", "2", "3", "4", "5"]', 3, NOW()),
  ('44444444-4444-4444-4444-444444444444', '12345678-1234-1234-1234-123456789abc', 'Comentários adicionais sobre sua experiência:', 'text', '[]', 4, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test responses with text data for sentiment analysis
INSERT INTO responses (survey_id, respondent_id, responses, sentiment_score, sentiment_category, created_at)
VALUES 
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "5", "22222222-2222-2222-2222-222222222222": "Excelente produto, muito satisfeito com a qualidade e atendimento!", "33333333-3333-3333-3333-333333333333": "5", "44444444-4444-4444-4444-444444444444": "Continuem assim, vocês são ótimos!"}', 5, 'positive', NOW()),
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "4", "22222222-2222-2222-2222-222222222222": "Bom produto, mas o atendimento poderia melhorar um pouco.", "33333333-3333-3333-3333-333333333333": "4", "44444444-4444-4444-4444-444444444444": "No geral estou satisfeito."}', 4, 'positive', NOW()),
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "2", "22222222-2222-2222-2222-222222222222": "Produto ruim, não atendeu minhas expectativas. Muito decepcionado.", "33333333-3333-3333-3333-333333333333": "1", "44444444-4444-4444-4444-444444444444": "Não recomendo, péssima experiência."}', 1, 'negative', NOW()),
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "3", "22222222-2222-2222-2222-222222222222": "Produto mediano, nada excepcional mas serve.", "33333333-3333-3333-3333-333333333333": "3", "44444444-4444-4444-4444-444444444444": "Neutro sobre a experiência."}', 3, 'neutral', NOW()),
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "5", "22222222-2222-2222-2222-222222222222": "Adorei o produto! Superou todas as expectativas, atendimento fantástico!", "33333333-3333-3333-3333-333333333333": "5", "44444444-4444-4444-4444-444444444444": "Parabéns pela excelência!"}', 5, 'positive', NOW()),
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "1", "22222222-2222-2222-2222-222222222222": "Terrível! Produto de péssima qualidade, atendimento horrível.", "33333333-3333-3333-3333-333333333333": "1", "44444444-4444-4444-4444-444444444444": "Nunca mais compro aqui, experiência traumática."}', 1, 'negative', NOW()),
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "4", "22222222-2222-2222-2222-222222222222": "Produto bom, entrega rápida, atendimento cordial.", "33333333-3333-3333-3333-333333333333": "4", "44444444-4444-4444-4444-444444444444": "Recomendo, boa experiência geral."}', 4, 'positive', NOW()),
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "2", "22222222-2222-2222-2222-222222222222": "Produto chegou com defeito, atendimento demorado para resolver.", "33333333-3333-3333-3333-333333333333": "2", "44444444-4444-4444-4444-444444444444": "Precisa melhorar muito o controle de qualidade."}', 2, 'negative', NOW()),
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "5", "22222222-2222-2222-2222-222222222222": "Incrível! Melhor produto que já comprei, atendimento nota 10!", "33333333-3333-3333-3333-333333333333": "5", "44444444-4444-4444-4444-444444444444": "Vocês são fantásticos, continuem assim!"}', 5, 'positive', NOW()),
  ('12345678-1234-1234-1234-123456789abc', gen_random_uuid(), '{"11111111-1111-1111-1111-111111111111": "3", "22222222-2222-2222-2222-222222222222": "Produto ok, nada demais. Atendimento padrão.", "33333333-3333-3333-3333-333333333333": "3", "44444444-4444-4444-4444-444444444444": "Experiência comum, sem grandes destaques."}', 3, 'neutral', NOW())
ON CONFLICT (id) DO NOTHING;