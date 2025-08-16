-- Criar tabela para armazenar dados temporários de checkout
CREATE TABLE public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  billing_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Policy para permitir inserção pública (edge functions usarão service role)
CREATE POLICY "public_insert_checkout_sessions" ON public.checkout_sessions
FOR INSERT
WITH CHECK (true);

-- Policy para permitir atualização por service role
CREATE POLICY "service_update_checkout_sessions" ON public.checkout_sessions
FOR UPDATE
USING (true);

-- Policy para permitir leitura por service role
CREATE POLICY "service_select_checkout_sessions" ON public.checkout_sessions
FOR SELECT
USING (true);

-- Índice para busca rápida por session_id
CREATE INDEX idx_checkout_sessions_stripe_session_id ON public.checkout_sessions(stripe_session_id);

-- Função para limpar sessões expiradas (executar via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_checkout_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.checkout_sessions 
  WHERE expires_at < now() AND status = 'pending';
END;
$$;