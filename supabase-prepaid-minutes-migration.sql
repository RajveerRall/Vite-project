-- Prepaid Minutes Migration
-- Adds prepaid_minutes column to profiles table for credit-based subscription system
-- Run this in Supabase SQL Editor

-- Add prepaid_minutes column (in minutes, INTEGER)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS prepaid_minutes INTEGER DEFAULT 0 NOT NULL;

-- Add index for query performance (partial index on non-zero values)
CREATE INDEX IF NOT EXISTS idx_profiles_prepaid_minutes 
ON profiles(prepaid_minutes) WHERE prepaid_minutes > 0;

-- Initialize existing users (migration)
UPDATE profiles SET prepaid_minutes = 0 WHERE prepaid_minutes IS NULL;

-- Verify migration
-- SELECT COUNT(*) as users_with_prepaid FROM profiles WHERE prepaid_minutes > 0;

