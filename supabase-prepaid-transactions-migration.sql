-- Prepaid Transactions Migration
-- Creates table to track all prepaid minute transactions for audit trail
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS prepaid_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'refund', 'expiration', 'usage')),
  minutes_amount INTEGER NOT NULL, -- Positive for purchases, negative for usage/refunds
  payment_id TEXT, -- DodoPayments payment ID
  product_id TEXT, -- Product ID if applicable
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE prepaid_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own prepaid transactions" ON prepaid_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage prepaid transactions" ON prepaid_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prepaid_transactions_user_id ON prepaid_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_transactions_customer_id ON prepaid_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_transactions_payment_id ON prepaid_transactions(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prepaid_transactions_type ON prepaid_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_prepaid_transactions_created_at ON prepaid_transactions(created_at DESC);

-- Helper function to log prepaid transactions
CREATE OR REPLACE FUNCTION log_prepaid_transaction(
  p_user_id UUID,
  p_customer_id TEXT,
  p_transaction_type TEXT,
  p_minutes_amount INTEGER,
  p_payment_id TEXT DEFAULT NULL,
  p_product_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Validate transaction type
  IF p_transaction_type NOT IN ('purchase', 'refund', 'expiration', 'usage') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  -- Insert transaction
  INSERT INTO prepaid_transactions (
    user_id,
    customer_id,
    transaction_type,
    minutes_amount,
    payment_id,
    product_id,
    metadata
  )
  VALUES (
    p_user_id,
    p_customer_id,
    p_transaction_type,
    p_minutes_amount,
    p_payment_id,
    p_product_id,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- Verify migration
-- SELECT COUNT(*) as transaction_count FROM prepaid_transactions;

