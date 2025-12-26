-- Function Security Fix Migration
-- Fixes function_search_path_mutable warning for increment_tts_usage
-- Run this in Supabase SQL Editor

-- Update increment_tts_usage to ensure search_path is set
-- This prevents search path injection attacks
CREATE OR REPLACE FUNCTION increment_tts_usage(
  p_user_id uuid,
  p_seconds integer,
  p_source text DEFAULT NULL,
  p_event_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- CRITICAL: This prevents search path injection
AS $$
DECLARE
  v_user_id uuid;
  v_month_start date;
  v_event_inserted boolean := false;
  v_limit_check JSONB;
  v_minutes_limit INTEGER;
  v_minutes_used INTEGER;
  v_seconds_used INTEGER;
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

  v_user_id := COALESCE(p_user_id, (SELECT auth.uid()));
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
  END IF;

  -- Get current balances (prepaid in minutes, used in seconds)
  SELECT 
    COALESCE(prepaid_minutes, 0),
    COALESCE(tts_minutes_used, 0),
    COALESCE(tts_minutes_limit, 0)
  INTO 
    v_prepaid_minutes,
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
    v_subscription_minutes_used := v_seconds_used / 60.0;
    v_subscription_minutes_to_add := v_subscription_to_consume / 60.0;

    -- Check if subscription limit would be exceeded
    IF (v_subscription_minutes_used + v_subscription_minutes_to_add) > v_minutes_limit THEN
      RAISE EXCEPTION 'TTS_USAGE_LIMIT_EXCEEDED: Usage limit exceeded. %/% minutes used.', 
        v_subscription_minutes_used::INTEGER, 
        v_minutes_limit;
    END IF;
  END IF;

  -- Update profiles with new usage and prepaid balance
  UPDATE profiles
  SET 
    tts_minutes_used = tts_minutes_used + p_seconds,
    prepaid_minutes = GREATEST(0, v_prepaid_remaining),
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Insert usage event if event_id provided
  IF p_event_id IS NOT NULL THEN
    BEGIN
      INSERT INTO tts_usage_events (
        user_id,
        event_id,
        used_seconds,
        source,
        created_at
      )
      VALUES (
        v_user_id,
        p_event_id,
        p_seconds,
        COALESCE(p_source, 'unknown'),
        NOW()
      );
      v_event_inserted := true;
    EXCEPTION WHEN unique_violation THEN
      -- Event already recorded, skip
      v_event_inserted := false;
    END;
  END IF;
END;
$$;

-- Verify the function has the correct search_path setting
-- You can check this by running:
-- SELECT prosrc, prosecdef, proconfig FROM pg_proc WHERE proname = 'increment_tts_usage';

