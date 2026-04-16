-- Add subscription_renewal as valid transaction type
-- Run this in Supabase SQL Editor

ALTER TABLE prepaid_transactions 
DROP CONSTRAINT IF EXISTS prepaid_transactions_transaction_type_check;

ALTER TABLE prepaid_transactions 
ADD CONSTRAINT prepaid_transactions_transaction_type_check 
CHECK (transaction_type IN ('purchase', 'refund', 'expiration', 'usage', 'subscription_renewal'));

-- Verify migration
-- SELECT DISTINCT transaction_type FROM prepaid_transactions;

