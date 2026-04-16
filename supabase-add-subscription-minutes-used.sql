-- Migration: Add subscription_minutes_used column to track subscription usage separately from prepaid
-- This enables proper reset logic: subscription usage resets monthly, prepaid never resets

-- Add subscription_minutes_used column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_minutes_used INTEGER DEFAULT 0;

-- Initialize existing users: set to 0 (start fresh tracking)
-- Note: We can't accurately calculate past subscription usage without historical prepaid balance data
UPDATE profiles 
SET subscription_minutes_used = 0 
WHERE subscription_minutes_used IS NULL;

-- Update check_tts_usage_limit() to use subscription_minutes_used instead of calculating from tts_minutes_used
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
    s.current_period_end
  INTO 
    v_minutes_limit,
    v_subscription_seconds_used,
    v_prepaid_minutes,
    v_last_reset_date,
    v_current_period_end
  FROM profiles p
  LEFT JOIN subscriptions s ON s.id = p.subscription_id
  WHERE p.id = v_user_id;

  -- If profile doesn't exist, create it with default limits
  IF v_minutes_limit IS NULL THEN
    INSERT INTO profiles (id, tts_minutes_limit, tts_minutes_used, subscription_minutes_used, prepaid_minutes)
    VALUES (v_user_id, 0, 0, 0, 0)
    ON CONFLICT (id) DO NOTHING;
    
    SELECT tts_minutes_limit, COALESCE(subscription_minutes_used, 0), COALESCE(prepaid_minutes, 0), last_reset_date
    INTO v_minutes_limit, v_subscription_seconds_used, v_prepaid_minutes, v_last_reset_date
    FROM profiles
    WHERE id = v_user_id;
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
    v_limit_exceeded := (v_minutes_limit - v_minutes_used) <= 0 AND v_prepaid_minutes <= 0;
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

-- Update reset_user_tts_usage() to reset subscription_minutes_used but keep prepaid_minutes
CREATE OR REPLACE FUNCTION reset_user_tts_usage(
  p_user_id UUID DEFAULT NULL,
  p_reset_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required');
  END IF;

  -- Reset subscription usage and total usage, but keep prepaid_minutes unchanged
  UPDATE profiles
  SET 
    subscription_minutes_used = 0,
    tts_minutes_used = 0,
    last_reset_date = NOW(),
    updated_at = NOW()
  WHERE id = v_user_id;

  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO profiles (id, tts_minutes_limit, tts_minutes_used, subscription_minutes_used, last_reset_date)
    VALUES (v_user_id, 0, 0, 0, NOW())
    ON CONFLICT (id) DO UPDATE
    SET subscription_minutes_used = 0, tts_minutes_used = 0, last_reset_date = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'reset_at', NOW(),
    'reason', p_reset_reason
  );
END;
$$;

-- Update increment_tts_usage() to track subscription_minutes_used separately
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
  v_prepaid_minutes INTEGER := 0;
  v_prepaid_seconds INTEGER := 0;
  v_prepaid_to_consume INTEGER := 0;
  v_subscription_to_consume INTEGER := 0;
  v_prepaid_remaining INTEGER := 0;
  v_subscription_minutes_used NUMERIC := 0;
  v_subscription_minutes_to_add NUMERIC := 0;
  v_needs_reset BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_seconds IS NULL OR p_seconds <= 0 THEN
    RETURN;
  END IF;

  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'increment_tts_usage: user id is required';
  END IF;

  -- Check usage limits first
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

  -- Get current balances (prepaid in minutes, subscription used in seconds, total used in seconds)
  SELECT 
    COALESCE(prepaid_minutes, 0),
    COALESCE(subscription_minutes_used, 0),
    COALESCE(tts_minutes_used, 0),
    COALESCE(tts_minutes_limit, 0)
  INTO 
    v_prepaid_minutes,
    v_subscription_seconds_used,
    v_seconds_used,
    v_minutes_limit
  FROM profiles
  WHERE id = v_user_id;

  -- Convert prepaid to seconds for consumption
  v_prepaid_seconds := v_prepaid_minutes * 60;

  -- Calculate consumption: use prepaid first, then subscription
  v_prepaid_to_consume := LEAST(p_seconds, v_prepaid_seconds);
  v_subscription_to_consume := GREATEST(0, p_seconds - v_prepaid_to_consume);

  -- Convert remaining prepaid back to minutes for storage (round down)
  v_prepaid_remaining := FLOOR((v_prepaid_seconds - v_prepaid_to_consume) / 60.0);

  -- Check subscription limit only if prepaid exhausted
  IF v_subscription_to_consume > 0 AND v_minutes_limit > 0 THEN
    -- Calculate subscription minutes used (from subscription_minutes_used field)
    v_subscription_minutes_used := v_subscription_seconds_used / 60.0;
    v_subscription_minutes_to_add := v_subscription_to_consume / 60.0;
    
    IF (v_subscription_minutes_used + v_subscription_minutes_to_add) > v_minutes_limit THEN
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

