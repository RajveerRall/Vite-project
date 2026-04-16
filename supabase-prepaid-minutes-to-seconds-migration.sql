-- Prepaid Minutes to Seconds Migration
-- Converts prepaid_minutes column to store seconds instead of minutes
-- This eliminates FLOOR rounding errors where small chunks (< 60s) consume 1 full minute
-- Run this in Supabase SQL Editor

-- Convert existing data: multiply minutes by 60 to get seconds
UPDATE profiles 
SET prepaid_minutes = prepaid_minutes * 60 
WHERE prepaid_minutes > 0;

-- Verify migration: should return 0 (no values < 60 seconds if they were originally minutes)
-- SELECT COUNT(*) as invalid_values FROM profiles WHERE prepaid_minutes > 0 AND prepaid_minutes < 60 AND prepaid_minutes != 0;

-- Note: After this migration:
-- - prepaid_minutes column now stores SECONDS (not minutes)
-- - Column name remains unchanged for backward compatibility
-- - Frontend code must divide by 60 for display
-- - Webhook handlers must multiply minutes by 60 when writing
-- - SQL functions work directly with seconds (no conversion needed)







