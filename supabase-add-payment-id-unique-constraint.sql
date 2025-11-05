-- Add unique constraint on payment_id for idempotent sync
-- Run this in Supabase SQL Editor

-- Check if unique constraint exists
SELECT conname FROM pg_constraint 
WHERE conrelid = 'prepaid_transactions'::regclass 
AND conname LIKE '%payment_id%';

-- Add unique constraint if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_prepaid_transactions_payment_id 
ON prepaid_transactions(payment_id) 
WHERE payment_id IS NOT NULL;

-- Verify constraint was created
-- SELECT * FROM pg_indexes WHERE tablename = 'prepaid_transactions' AND indexname = 'idx_prepaid_transactions_payment_id';

