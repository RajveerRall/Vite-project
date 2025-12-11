-- Fix Free Tier Limit Bug
-- This migration fixes the bug where free tier users (6 hours/360 minutes) can use unlimited TTS
-- because the limit is never enforced when tts_minutes_limit = 0
--
-- Run this in Supabase SQL Editor
--
-- Problem:
-- 1. check_tts_usage_limit returns limit_exceeded = FALSE and minutes_remaining = NULL when limit is 0
-- 2. increment_tts_usage skips limit checks when v_minutes_limit = 0
-- 3. Frontend checks fail because minutes_remaining is NULL
--
-- Solution:
-- Apply the 360-minute (6-hour) free tier limit to users without active subscriptions
-- when their tts_minutes_limit = 0

-- Update check_tts_usage_limit function to apply free tier limit
CREATE OR REPLACE FUNCTION check_tts_usage_limit(
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_minutes_limit INTEGER;
  v_minutes_used INTEGER;
  v_subscription_seconds_used INTEGER;
  v_prepaid_minutes INTEGER := 0;
  v_last_reset_date TIMESTAMP WITH TIME ZONE;
  v_current_period_end TIMESTAMP WITH TIME ZONE;
  v_needs_reset BOOLEAN := FALSE;
  v_minutes_remaining INTEGER;
  v_limit_exceeded BOOLEAN := FALSE;
  v_has_active_subscription BOOLEAN := FALSE;
  v_subscription_status TEXT;
  v_free_tier_limit INTEGER := 360; -- 6 hours in minutes
BEGIN
  -- Get user ID
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_limit', false,
      'error', 'User ID is required'
    );
  END IF;

  -- Fetch user's subscription and limit info (including prepaid)
  SELECT 
    p.tts_minutes_limit,
    COALESCE(p.subscription_minutes_used, 0),
    COALESCE(p.prepaid_minutes, 0),
    p.last_reset_date,
    s.current_period_end,
    s.status,
    CASE WHEN s.id IS NOT NULL AND s.status IN ('active', 'trial') THEN TRUE ELSE FALSE END
  INTO 
    v_minutes_limit,
    v_subscription_seconds_used,
    v_prepaid_minutes,
    v_last_reset_date,
    v_current_period_end,
    v_subscription_status,
    v_has_active_subscription
  FROM profiles p
  LEFT JOIN subscriptions s ON s.id = p.subscription_id
  WHERE p.id = v_user_id;

  -- If profile doesn't exist, create it with free tier limit
  IF v_minutes_limit IS NULL THEN
    INSERT INTO profiles (id, tts_minutes_limit, tts_minutes_used, subscription_minutes_used, prepaid_minutes)
    VALUES (v_user_id, v_free_tier_limit, 0, 0, 0)
    ON CONFLICT (id) DO NOTHING;
    
    SELECT tts_minutes_limit, COALESCE(subscription_minutes_used, 0), COALESCE(prepaid_minutes, 0), last_reset_date
    INTO v_minutes_limit, v_subscription_seconds_used, v_prepaid_minutes, v_last_reset_date
    FROM profiles
    WHERE id = v_user_id;
  END IF;

  -- Apply free tier limit if user has no active subscription and limit is 0
  IF NOT v_has_active_subscription AND v_minutes_limit = 0 THEN
    v_minutes_limit := v_free_tier_limit;
    -- Update profile to persist the free tier limit
    UPDATE profiles
    SET tts_minutes_limit = v_free_tier_limit
    WHERE id = v_user_id AND tts_minutes_limit = 0;
  END IF;

  -- Convert subscription seconds to minutes
  v_minutes_used := COALESCE(v_subscription_seconds_used, 0) / 60;

  -- Check if reset is needed based on subscription period
  IF v_current_period_end IS NOT NULL AND v_last_reset_date IS NOT NULL THEN
    IF v_last_reset_date < v_current_period_end AND NOW() >= v_current_period_end THEN
      v_needs_reset := TRUE;
    END IF;
  ELSIF v_last_reset_date IS NULL THEN
    -- First time check, set reset date
    v_needs_reset := TRUE;
  END IF;

  -- Calculate remaining minutes (include prepaid in total)
  -- NOTE: prepaid_minutes now stores SECONDS, convert to minutes for display
  IF v_minutes_limit > 0 THEN
    v_minutes_remaining := GREATEST(0, v_minutes_limit - v_minutes_used) + (v_prepaid_minutes / 60.0);
    -- FIXED: Treat as exceeded if remaining subscription time is less than 1 minute
    -- This handles decimal precision issues (e.g., 0.0166 minutes = 1 second remaining)
    -- Only consider exceeded if subscription limit is exhausted AND no prepaid minutes
    v_limit_exceeded := ((v_minutes_limit - v_minutes_used) < 1.0 AND (v_prepaid_minutes / 60.0) <= 0) OR 
                        ((v_minutes_limit - v_minutes_used) <= 0 AND (v_prepaid_minutes / 60.0) <= 0);
  ELSIF v_prepaid_minutes > 0 THEN
    -- No subscription limit, but has prepaid (convert seconds to minutes)
    v_minutes_remaining := v_prepaid_minutes / 60.0;
    v_limit_exceeded := FALSE;
  ELSE
    -- No limit set (unlimited or free tier)
    v_minutes_remaining := NULL;
    v_limit_exceeded := FALSE;
  END IF;

  RETURN jsonb_build_object(
    'has_limit', v_minutes_limit > 0 OR v_prepaid_minutes > 0,
    'minutes_limit', v_minutes_limit,
    'prepaid_minutes', (v_prepaid_minutes / 60.0)::INTEGER,  -- Convert seconds to minutes for API response
    'subscription_minutes_used', v_minutes_used,
    'minutes_used', v_minutes_used,
    'minutes_remaining', v_minutes_remaining,
    'limit_exceeded', v_limit_exceeded,
    'needs_reset', v_needs_reset,
    'last_reset_date', v_last_reset_date,
    'current_period_end', v_current_period_end
  );
END;
$$;

-- Update increment_tts_usage function to enforce free tier limits
CREATE OR REPLACE FUNCTION increment_tts_usage(
  p_user_id uuid,
  p_seconds integer,
  p_source text DEFAULT NULL,
  p_event_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_month_start date;
  v_event_inserted boolean := false;
  v_limit_check JSONB;
  v_minutes_limit INTEGER;
  v_minutes_used INTEGER;
  v_seconds_used INTEGER;
  v_subscription_seconds_used INTEGER;
  v_prepaid_minutes INTEGER := 0;  -- NOTE: Stores seconds (column name kept for compatibility)
  v_prepaid_to_consume INTEGER := 0;
  v_subscription_to_consume INTEGER := 0;
  v_prepaid_remaining INTEGER := 0;
  v_subscription_minutes_used NUMERIC := 0;
  v_subscription_minutes_to_add NUMERIC := 0;
  v_needs_reset BOOLEAN;
  v_subscription_id UUID;
  v_has_active_subscription BOOLEAN := FALSE;
BEGIN
  -- Validate inputs
  IF p_seconds IS NULL OR p_seconds <= 0 THEN
    RETURN;
  END IF;

  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'increment_tts_usage: user id is required';
  END IF;

  -- Check usage limits first (this may apply free tier limit and update profile)
  v_limit_check := check_tts_usage_limit(v_user_id);
  v_minutes_limit := (v_limit_check->>'minutes_limit')::INTEGER;
  v_needs_reset := (v_limit_check->>'needs_reset')::BOOLEAN;

  -- Reset usage if needed
  IF v_needs_reset THEN
    PERFORM reset_user_tts_usage(v_user_id, 'period_reset');
    v_minutes_used := 0;
    v_seconds_used := 0;
    v_subscription_seconds_used := 0;
  END IF;

  -- Get current balances (prepaid in seconds, subscription used in seconds, total used in seconds)
  -- NOTE: prepaid_minutes column now stores SECONDS (not minutes) for precision
  -- Re-fetch limit from profile as check_tts_usage_limit may have updated it (free tier limit)
  SELECT 
    COALESCE(prepaid_minutes, 0),
    COALESCE(subscription_minutes_used, 0),
    COALESCE(tts_minutes_used, 0),
    COALESCE(tts_minutes_limit, 0),
    p.subscription_id
  INTO 
    v_prepaid_minutes,
    v_subscription_seconds_used,
    v_seconds_used,
    v_minutes_limit,
    v_subscription_id
  FROM profiles p
  WHERE p.id = v_user_id;
  
  -- If limit was 0 but check_tts_usage_limit applied free tier limit, use the updated limit
  IF v_minutes_limit = 0 AND (v_limit_check->>'minutes_limit')::INTEGER > 0 THEN
    v_minutes_limit := (v_limit_check->>'minutes_limit')::INTEGER;
  END IF;
  
  -- Defensive check: If user has active subscription but limit is 0, try to fix it
  IF v_subscription_id IS NOT NULL THEN
    -- Check if user has an active subscription
    SELECT EXISTS(
      SELECT 1 FROM subscriptions s
      WHERE s.id = v_subscription_id
        AND s.status IN ('active', 'trial')
    ) INTO v_has_active_subscription;
    
    -- If limit is 0 but user has active subscription, try to get limit from product
    IF v_minutes_limit = 0 AND v_has_active_subscription THEN
      SELECT COALESCE(p.tts_minutes_included, 0)
      INTO v_minutes_limit
      FROM subscriptions s
      JOIN products p ON p.gateway_product_id = s.plan_id
      WHERE s.id = v_subscription_id
        AND s.status IN ('active', 'trial')
      LIMIT 1;
      
      -- If we found a valid limit, update the profile
      IF v_minutes_limit > 0 THEN
        UPDATE profiles
        SET tts_minutes_limit = v_minutes_limit
        WHERE id = v_user_id;
        
        RAISE WARNING 'Fixed tts_minutes_limit for user %: was 0, now %', v_user_id, v_minutes_limit;
      ELSE
        RAISE WARNING 'User % has active subscription but tts_minutes_limit is 0 and product not found', v_user_id;
      END IF;
    END IF;
  END IF;

  -- Calculate consumption: use prepaid first, then subscription
  -- prepaid_minutes now stores seconds directly, no conversion needed
  v_prepaid_to_consume := LEAST(p_seconds, v_prepaid_minutes);
  v_subscription_to_consume := GREATEST(0, p_seconds - v_prepaid_to_consume);

  -- Calculate remaining prepaid (in seconds)
  v_prepaid_remaining := v_prepaid_minutes - v_prepaid_to_consume;

  -- Check subscription/free tier limit only if prepaid exhausted
  -- Note: Free tier limit is now enforced here (v_minutes_limit will be 360 for free tier users)
  IF v_subscription_to_consume > 0 AND v_minutes_limit > 0 THEN
    -- Calculate subscription minutes used (from subscription_minutes_used field)
    v_subscription_minutes_used := v_subscription_seconds_used / 60.0;
    v_subscription_minutes_to_add := v_subscription_to_consume / 60.0;
    
    -- FIXED: Block if adding usage would exceed limit OR leave less than 1 minute remaining
    -- This prevents edge cases where tiny remaining amounts (like 0.0166 minutes = 1 second) allow continued usage
    IF (v_subscription_minutes_used + v_subscription_minutes_to_add) > v_minutes_limit OR
       (v_minutes_limit - (v_subscription_minutes_used + v_subscription_minutes_to_add)) < 1.0 THEN
      RAISE EXCEPTION 'TTS_USAGE_LIMIT_EXCEEDED' USING 
        MESSAGE = 'TTS usage limit exceeded. Please upgrade your subscription.',
        DETAIL = format('Current subscription usage: %s minutes, Limit: %s minutes, Prepaid remaining: %s minutes', 
                       ROUND(v_subscription_minutes_used, 2), v_minutes_limit, v_prepaid_remaining);
    END IF;
  END IF;

  v_month_start := date_trunc('month', now())::date;

  -- Insert event with idempotency check (if event_id provided)
  IF p_event_id IS NOT NULL AND p_event_id != '' THEN
    BEGIN
      INSERT INTO tts_usage_events (event_id, user_id, seconds, source)
      VALUES (p_event_id, v_user_id, p_seconds, p_source)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING true INTO v_event_inserted;
      
      IF NOT v_event_inserted THEN
        RETURN;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to insert event with id %: %', p_event_id, SQLERRM;
    END;
  ELSE
    BEGIN
      INSERT INTO tts_usage_events (user_id, seconds, source)
      VALUES (v_user_id, p_seconds, p_source);
      v_event_inserted := true;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to insert event: %', SQLERRM;
    END;
  END IF;

  -- Upsert monthly bucket (only if event was successfully inserted or no event_id provided)
  IF v_event_inserted OR p_event_id IS NULL THEN
    INSERT INTO tts_quota_monthly (user_id, month_start, used_seconds)
    VALUES (v_user_id, v_month_start, p_seconds)
    ON CONFLICT (user_id, month_start)
    DO UPDATE SET used_seconds = tts_quota_monthly.used_seconds + EXCLUDED.used_seconds,
                  updated_at = now();
  END IF;

  -- Upsert per-source monthly bucket
  IF v_event_inserted OR p_event_id IS NULL THEN
    INSERT INTO tts_quota_monthly_by_source (user_id, month_start, source, used_seconds)
    VALUES (v_user_id, v_month_start, COALESCE(NULLIF(p_source, ''), 'unknown'), p_seconds)
    ON CONFLICT (user_id, month_start, source)
    DO UPDATE SET used_seconds = tts_quota_monthly_by_source.used_seconds + EXCLUDED.used_seconds,
                  updated_at = now();
  END IF;

  -- Update profiles table atomically with prepaid consumption and subscription tracking
  IF v_event_inserted OR p_event_id IS NULL THEN
    UPDATE profiles 
    SET 
      prepaid_minutes = v_prepaid_remaining,
      subscription_minutes_used = subscription_minutes_used + v_subscription_to_consume,  -- Only increment subscription usage
      tts_minutes_used = tts_minutes_used + p_seconds,  -- Keep total for historical tracking
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;
END;
$$;





