-- Test Free Tier Limit Implementation
-- Run these queries in Supabase SQL Editor to verify the 360-minute free tier limit
-- 
-- Prerequisites:
-- 1. You have applied the updated check_tts_usage_limit function
-- 2. You have applied the migration script for existing users
-- 3. You have at least one test user without a subscription

-- ============================================================================
-- TEST 1: Verify Function Returns 360 Minutes for Users Without Subscriptions
-- ============================================================================

-- Replace 'YOUR_USER_ID_HERE' with an actual user ID without subscription
-- Or use: SELECT id FROM profiles WHERE subscription_id IS NULL LIMIT 1;

SELECT 
  'Test 1: User without subscription' as test_name,
  p.id as user_id,
  p.tts_minutes_limit as profile_limit,
  p.subscription_id,
  s.status as subscription_status,
  check_tts_usage_limit(p.id) as limit_check_result
FROM profiles p
LEFT JOIN subscriptions s ON s.id = p.subscription_id
WHERE p.subscription_id IS NULL 
  OR s.status NOT IN ('active', 'trial')
LIMIT 1;

-- Expected Result:
-- - minutes_limit should be 360
-- - has_limit should be true
-- - limit_exceeded should be false (if usage < 360 minutes)

-- ============================================================================
-- TEST 2: Verify Users With Active Subscriptions Keep Their Subscription Limit
-- ============================================================================

SELECT 
  'Test 2: User with active subscription' as test_name,
  p.id as user_id,
  p.tts_minutes_limit as profile_limit,
  p.subscription_id,
  s.status as subscription_status,
  pr.tts_minutes_included as product_limit,
  check_tts_usage_limit(p.id) as limit_check_result
FROM profiles p
JOIN subscriptions s ON s.id = p.subscription_id
LEFT JOIN products pr ON pr.gateway_product_id = s.plan_id
WHERE s.status IN ('active', 'trial')
LIMIT 1;

-- Expected Result:
-- - minutes_limit should equal product.tts_minutes_included (NOT 360)
-- - has_limit should be true
-- - The function should NOT apply free tier limit to subscribed users

-- ============================================================================
-- TEST 3: Verify Existing Users With Limit=0 Get 360 Minutes Applied
-- ============================================================================

-- First, find a user with limit=0 and no subscription
SELECT 
  'Test 3: Existing user with limit=0' as test_name,
  p.id as user_id,
  p.tts_minutes_limit as before_limit,
  p.subscription_id
FROM profiles p
LEFT JOIN subscriptions s ON s.id = p.subscription_id
WHERE p.tts_minutes_limit = 0
  AND (p.subscription_id IS NULL OR s.status NOT IN ('active', 'trial'))
LIMIT 1;

-- Then call the function (this should update the limit)
-- Replace USER_ID with the ID from above query
-- SELECT check_tts_usage_limit('USER_ID_HERE');

-- Then verify the profile was updated
-- SELECT tts_minutes_limit FROM profiles WHERE id = 'USER_ID_HERE';

-- Expected Result:
-- - After calling check_tts_usage_limit, tts_minutes_limit should be 360
-- - The function should automatically update the profile

-- ============================================================================
-- TEST 4: Verify New Profile Creation Gets 360 Minutes
-- ============================================================================

-- This test requires creating a new profile (or simulating it)
-- The function should create profiles with 360 minutes if they don't exist

-- Test by calling check_tts_usage_limit with a non-existent user ID
-- (This will fail in practice, but you can test with a real user who doesn't have a profile)

-- Expected: When profile is created by the function, it should have tts_minutes_limit = 360

-- ============================================================================
-- TEST 5: Verify Limit Enforcement (Should Block When Exceeded)
-- ============================================================================

-- Set up a test user with usage near the limit
-- Replace USER_ID with a test user ID

-- Step 1: Set user to have used 359 minutes (just under limit)
-- UPDATE profiles 
-- SET subscription_minutes_used = 359 * 60,  -- 359 minutes in seconds
--     tts_minutes_limit = 360
-- WHERE id = 'USER_ID_HERE';

-- Step 2: Try to increment usage by 2 minutes (should exceed limit)
-- SELECT increment_tts_usage('USER_ID_HERE', 120, 'test');  -- 120 seconds = 2 minutes

-- Expected Result:
-- - Should raise exception: TTS_USAGE_LIMIT_EXCEEDED
-- - Error message should indicate limit exceeded

-- Step 3: Clean up - reset usage
-- UPDATE profiles 
-- SET subscription_minutes_used = 0,
--     tts_minutes_used = 0
-- WHERE id = 'USER_ID_HERE';

-- ============================================================================
-- TEST 6: Verify Prepaid Minutes Still Work With Free Tier Limit
-- ============================================================================

SELECT 
  'Test 6: Prepaid minutes with free tier' as test_name,
  p.id as user_id,
  p.tts_minutes_limit,
  p.prepaid_minutes,
  p.subscription_minutes_used / 60.0 as subscription_minutes_used,
  check_tts_usage_limit(p.id) as limit_check_result
FROM profiles p
LEFT JOIN subscriptions s ON s.id = p.subscription_id
WHERE p.prepaid_minutes > 0
  AND (p.subscription_id IS NULL OR s.status NOT IN ('active', 'trial'))
LIMIT 1;

-- Expected Result:
-- - minutes_limit should be 360
-- - prepaid_minutes should be included in minutes_remaining
-- - minutes_remaining = (360 - subscription_minutes_used) + prepaid_minutes

-- ============================================================================
-- TEST 7: Summary Query - Check All Users Without Subscriptions
-- ============================================================================

SELECT 
  COUNT(*) as total_users_without_subscription,
  COUNT(CASE WHEN tts_minutes_limit = 360 THEN 1 END) as users_with_360_limit,
  COUNT(CASE WHEN tts_minutes_limit = 0 THEN 1 END) as users_with_0_limit,
  COUNT(CASE WHEN tts_minutes_limit > 0 AND tts_minutes_limit != 360 THEN 1 END) as users_with_other_limit
FROM profiles p
LEFT JOIN subscriptions s ON s.id = p.subscription_id
WHERE p.subscription_id IS NULL 
  OR s.status NOT IN ('active', 'trial');

-- Expected Result:
-- - users_with_360_limit should be > 0 (or equal to total if migration ran)
-- - users_with_0_limit should be 0 (or low if migration hasn't run yet)
-- - users_with_other_limit should be 0 (unless they have prepaid or other special cases)

-- ============================================================================
-- TEST 8: Verify Function Logic - Check Subscription Status Detection
-- ============================================================================

SELECT 
  p.id as user_id,
  p.subscription_id,
  s.status as subscription_status,
  CASE 
    WHEN s.id IS NOT NULL AND s.status IN ('active', 'trial') THEN 'has_active_subscription'
    ELSE 'no_active_subscription'
  END as subscription_check,
  p.tts_minutes_limit as current_limit,
  (check_tts_usage_limit(p.id)->>'minutes_limit')::INTEGER as function_limit
FROM profiles p
LEFT JOIN subscriptions s ON s.id = p.subscription_id
ORDER BY 
  CASE WHEN s.status IN ('active', 'trial') THEN 0 ELSE 1 END,
  p.id
LIMIT 10;

-- Expected Result:
-- - Users with no_active_subscription should have function_limit = 360
-- - Users with has_active_subscription should have function_limit = their subscription limit
-- - current_limit may be 0 for existing users, but function_limit should be correct

-- ============================================================================
-- CLEANUP QUERIES (Optional - for testing)
-- ============================================================================

-- Reset a test user's usage and limit (replace USER_ID)
-- UPDATE profiles 
-- SET tts_minutes_limit = 0,
--     subscription_minutes_used = 0,
--     tts_minutes_used = 0,
--     prepaid_minutes = 0
-- WHERE id = 'USER_ID_HERE';

-- Check function definition to verify it includes free tier logic
-- SELECT pg_get_functiondef(oid) 
-- FROM pg_proc 
-- WHERE proname = 'check_tts_usage_limit';

-- The function definition should include:
-- - v_free_tier_limit INTEGER := 360;
-- - Logic to check subscription status
-- - Logic to apply 360 minutes if no active subscription and limit is 0












