-- Migration: Fix tts_minutes_limit for existing users with active subscriptions
-- This fixes the bug where tts_minutes_limit was not properly set when subscriptions were created/updated
-- Run this in your Supabase SQL Editor

-- IMPORTANT: Run this as service_role or disable RLS temporarily for this migration
-- You may need to run: SET ROLE service_role; before executing

-- Step 1: Diagnostic queries to check what data exists
-- Run these first to understand your data:

-- Check if there are any active subscriptions
SELECT 
  COUNT(*) as active_subscriptions_count,
  COUNT(DISTINCT user_id) as unique_users_with_subscriptions
FROM subscriptions 
WHERE status IN ('active', 'trial');

-- Check if there are any products
SELECT 
  COUNT(*) as products_count,
  COUNT(CASE WHEN tts_minutes_included > 0 THEN 1 END) as products_with_minutes
FROM products;

-- Check profiles with subscriptions
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN subscription_id IS NOT NULL THEN 1 END) as profiles_with_subscription_id
FROM profiles;

-- Detailed check: Show all subscriptions and their linked profiles
SELECT 
  s.id as subscription_id,
  s.user_id,
  s.status,
  s.plan_id,
  p.id as profile_id,
  p.subscription_id as profile_subscription_id,
  p.tts_minutes_limit,
  CASE 
    WHEN p.subscription_id = s.id THEN 'LINKED'
    WHEN p.id = s.user_id AND p.subscription_id IS NULL THEN 'MISSING LINK'
    WHEN p.id = s.user_id AND p.subscription_id != s.id THEN 'WRONG LINK'
    ELSE 'NO PROFILE'
  END as link_status
FROM subscriptions s
LEFT JOIN profiles p ON p.id = s.user_id
WHERE s.status IN ('active', 'trial')
ORDER BY s.id;

-- Check products and their minutes
SELECT 
  gateway_product_id,
  name,
  tts_minutes_included,
  is_active
FROM products
ORDER BY gateway_product_id;

-- Step 2: First, fix missing subscription_id links in profiles
-- Some profiles might have subscriptions but subscription_id is not set
UPDATE profiles p
SET 
  subscription_id = s.id,
  updated_at = NOW()
FROM subscriptions s
WHERE p.id = s.user_id
  AND p.subscription_id IS NULL
  AND s.status IN ('active', 'trial');

-- Step 3: Update profiles with correct tts_minutes_limit based on their active subscription's product
-- This uses a subquery approach which is more reliable than FROM clause joins in UPDATE
UPDATE profiles
SET 
  tts_minutes_limit = subquery.tts_minutes_included,
  subscription_id = subquery.subscription_id, -- Ensure link is set
  updated_at = NOW()
FROM (
  SELECT 
    p.id as profile_id,
    s.id as subscription_id,
    COALESCE(prod.tts_minutes_included, 0) as tts_minutes_included
  FROM profiles p
  INNER JOIN subscriptions s ON (p.subscription_id = s.id OR p.id = s.user_id)
  INNER JOIN products prod ON prod.gateway_product_id = s.plan_id
  WHERE s.status IN ('active', 'trial')
    AND (p.tts_minutes_limit = 0 OR p.tts_minutes_limit IS NULL OR p.tts_minutes_limit != prod.tts_minutes_included)
    AND prod.tts_minutes_included > 0
) AS subquery
WHERE profiles.id = subquery.profile_id;

-- Step 4: Log how many profiles were updated
DO $$
DECLARE
  v_updated_count INTEGER;
  v_total_with_subscriptions INTEGER;
BEGIN
  -- Count profiles that now have correct limits
  SELECT COUNT(*) INTO v_updated_count
  FROM profiles p
  INNER JOIN subscriptions s ON p.subscription_id = s.id
  INNER JOIN products prod ON prod.gateway_product_id = s.plan_id
  WHERE s.status IN ('active', 'trial')
    AND p.tts_minutes_limit = prod.tts_minutes_included
    AND prod.tts_minutes_included > 0;
  
  -- Count total profiles with active subscriptions
  SELECT COUNT(*) INTO v_total_with_subscriptions
  FROM profiles p
  INNER JOIN subscriptions s ON p.subscription_id = s.id
  WHERE s.status IN ('active', 'trial');
  
  RAISE NOTICE 'Migration complete.';
  RAISE NOTICE 'Total profiles with active subscriptions: %', v_total_with_subscriptions;
  RAISE NOTICE 'Profiles with correct limits: %', v_updated_count;
END $$;

-- Step 5: Verification query - Show users with active subscriptions and their limits
-- This will help you see what was fixed
SELECT 
  p.id as user_id,
  p.tts_minutes_limit as profile_limit,
  prod.tts_minutes_included as product_limit,
  s.status as subscription_status,
  s.plan_id,
  prod.name as product_name,
  CASE 
    WHEN p.subscription_id = s.id THEN 'LINKED'
    WHEN p.subscription_id IS NULL THEN 'MISSING LINK'
    ELSE 'WRONG LINK'
  END as link_status,
  CASE 
    WHEN p.tts_minutes_limit = prod.tts_minutes_included THEN 'CORRECT'
    WHEN p.tts_minutes_limit = 0 AND prod.tts_minutes_included > 0 THEN 'NEEDS FIX'
    WHEN p.tts_minutes_limit IS NULL AND prod.tts_minutes_included > 0 THEN 'NEEDS FIX'
    ELSE 'MISMATCH'
  END as limit_status
FROM subscriptions s
LEFT JOIN profiles p ON (p.subscription_id = s.id OR p.id = s.user_id)
LEFT JOIN products prod ON prod.gateway_product_id = s.plan_id
WHERE s.status IN ('active', 'trial')
ORDER BY limit_status, link_status, p.id;

