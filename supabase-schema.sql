-- Script SQL para criar as tabelas necessárias para integração com Stripe
-- Execute este script no seu projeto Supabase

-- Adicionar colunas relacionadas ao Stripe na tabela profiles (se não existirem)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Criar tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status VARCHAR(50) NOT NULL,
  plan_type VARCHAR(50),
  billing_type VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_session_id ON transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at na tabela transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security) para a tabela transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias transações
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Política para permitir inserção de transações (para webhooks)
CREATE POLICY "Allow transaction creation" ON transactions
    FOR INSERT WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE transactions IS 'Tabela para armazenar transações de pagamento do Stripe';
COMMENT ON COLUMN transactions.stripe_session_id IS 'ID da sessão de checkout do Stripe';
COMMENT ON COLUMN transactions.stripe_payment_intent_id IS 'ID do payment intent do Stripe';
COMMENT ON COLUMN transactions.status IS 'Status da transação: pending, completed, failed, refunded';
COMMENT ON COLUMN transactions.plan_type IS 'Tipo do plano: vortex-neural, nexus-infinito';
COMMENT ON COLUMN transactions.billing_type IS 'Tipo de cobrança: monthly, yearly';

COMMENT ON COLUMN profiles.subscription_status IS 'Status da assinatura: inactive, active, past_due, canceled';
COMMENT ON COLUMN profiles.plan_type IS 'Tipo do plano atual do usuário';
COMMENT ON COLUMN profiles.billing_type IS 'Tipo de cobrança: monthly, yearly';
COMMENT ON COLUMN profiles.subscription_id IS 'ID da assinatura no Stripe';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'ID do cliente no Stripe';