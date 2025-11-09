-- Fix limit_exceeded calculation to handle decimal precision issues
-- When remaining time is less than 1 minute, treat as limit exceeded
-- This prevents edge cases where tiny remaining amounts (like 0.0166 minutes = 1 second) allow continued usage
--
-- Run this in Supabase SQL Editor

-- Update check_tts_usage_limit function to fix limit_exceeded calculation
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
  IF v_minutes_limit > 0 THEN
    v_minutes_remaining := GREATEST(0, v_minutes_limit - v_minutes_used) + v_prepaid_minutes;
    -- FIXED: Treat as exceeded if remaining subscription time is less than 1 minute
    -- This handles decimal precision issues (e.g., 0.0166 minutes = 1 second remaining)
    -- Only consider exceeded if subscription limit is exhausted AND no prepaid minutes
    v_limit_exceeded := ((v_minutes_limit - v_minutes_used) < 1.0 AND v_prepaid_minutes <= 0) OR 
                        ((v_minutes_limit - v_minutes_used) <= 0 AND v_prepaid_minutes <= 0);
  ELSIF v_prepaid_minutes > 0 THEN
    -- No subscription limit, but has prepaid
    v_minutes_remaining := v_prepaid_minutes;
    v_limit_exceeded := FALSE;
  ELSE
    -- No limit set (unlimited or free tier)
    v_minutes_remaining := NULL;
    v_limit_exceeded := FALSE;
  END IF;

  RETURN jsonb_build_object(
    'has_limit', v_minutes_limit > 0 OR v_prepaid_minutes > 0,
    'minutes_limit', v_minutes_limit,
    'prepaid_minutes', v_prepaid_minutes,
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



