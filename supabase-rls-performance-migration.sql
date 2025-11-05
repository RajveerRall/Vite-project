-- Migration: Optimize RLS Policies and Fix Function Security Warnings
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (uses DROP POLICY IF EXISTS and CREATE OR REPLACE)
--
-- This fixes performance warnings by optimizing RLS policies to evaluate
-- auth.uid() and auth.role() once per query instead of per row.
-- Also fixes security warnings by adding SET search_path to functions.

-- ============================================================================
-- PART 1: Optimize RLS Policies with Subquery Pattern
-- ============================================================================

-- Books Table Policies
DROP POLICY IF EXISTS "Users can manage their own books" ON books;
CREATE POLICY "Users can manage their own books" ON books
  FOR ALL 
  USING (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can insert their own books" ON books;
CREATE POLICY "Users can insert their own books" ON books
  FOR INSERT 
  WITH CHECK (user_id = (select auth.uid())::text);

-- TTS Quota Monthly Policies
-- Note: Also handles old policy name "select own monthly quota" if it exists
DROP POLICY IF EXISTS "select own monthly quota" ON tts_quota_monthly;
DROP POLICY IF EXISTS "User can read own monthly tts usage" ON tts_quota_monthly;
CREATE POLICY "User can read own monthly tts usage" ON tts_quota_monthly
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User can upsert own monthly tts usage" ON tts_quota_monthly;
CREATE POLICY "User can upsert own monthly tts usage" ON tts_quota_monthly
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User can update own monthly tts usage" ON tts_quota_monthly;
CREATE POLICY "User can update own monthly tts usage" ON tts_quota_monthly
  FOR UPDATE USING (user_id = (select auth.uid()));

-- TTS Usage Events Policies
DROP POLICY IF EXISTS "User can insert own tts usage events" ON tts_usage_events;
CREATE POLICY "User can insert own tts usage events" ON tts_usage_events
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User can read own tts usage events" ON tts_usage_events;
CREATE POLICY "User can read own tts usage events" ON tts_usage_events
  FOR SELECT USING (user_id = (select auth.uid()));

-- TTS Usage Log Policies (if table exists)
-- Note: This table may exist in database but not in current schema files
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tts_usage_log') THEN
    DROP POLICY IF EXISTS "insert own usage" ON tts_usage_log;
    CREATE POLICY "insert own usage" ON tts_usage_log
      FOR INSERT WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;

-- TTS Quota Monthly By Source Policies
DROP POLICY IF EXISTS "User can read own monthly tts usage by source" ON tts_quota_monthly_by_source;
CREATE POLICY "User can read own monthly tts usage by source" ON tts_quota_monthly_by_source
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User can upsert own monthly tts usage by source" ON tts_quota_monthly_by_source;
CREATE POLICY "User can upsert own monthly tts usage by source" ON tts_quota_monthly_by_source
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "User can update own monthly tts usage by source" ON tts_quota_monthly_by_source;
CREATE POLICY "User can update own monthly tts usage by source" ON tts_quota_monthly_by_source
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = (select auth.uid()));

-- Subscriptions Policies
DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;
CREATE POLICY "Users can read own subscriptions" ON subscriptions
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Products Policies
DROP POLICY IF EXISTS "Anyone can read active products" ON products;
CREATE POLICY "Anyone can read active products" ON products
  FOR SELECT USING (is_active = TRUE OR (select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role can manage products" ON products;
CREATE POLICY "Service role can manage products" ON products
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Prices Policies
DROP POLICY IF EXISTS "Anyone can read active prices" ON prices;
CREATE POLICY "Anyone can read active prices" ON prices
  FOR SELECT USING (is_active = TRUE OR (select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role can manage prices" ON prices;
CREATE POLICY "Service role can manage prices" ON prices
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Anonymous TTS Sessions Policies (auth.role())
DROP POLICY IF EXISTS "Allow authenticated read of anonymous sessions" ON anonymous_tts_sessions;
CREATE POLICY "Allow authenticated read of anonymous sessions" ON anonymous_tts_sessions
  FOR SELECT USING ((select auth.role()) = 'authenticated' OR (select auth.role()) = 'service_role');

-- Anonymous TTS Usage Policies (auth.role())
DROP POLICY IF EXISTS "Allow authenticated read of anonymous usage" ON anonymous_tts_usage;
CREATE POLICY "Allow authenticated read of anonymous usage" ON anonymous_tts_usage
  FOR SELECT USING ((select auth.role()) = 'authenticated' OR (select auth.role()) = 'service_role');

-- Storage Policies for Book Files
DROP POLICY IF EXISTS "Users can upload their own book files" ON storage.objects;
CREATE POLICY "Users can upload their own book files" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'book-files' AND (select auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own book files" ON storage.objects;
CREATE POLICY "Users can view their own book files" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'book-files' AND (select auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own book files" ON storage.objects;
CREATE POLICY "Users can delete their own book files" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'book-files' AND (select auth.uid())::text = (storage.foldername(name))[1]);

-- Storage Policies for Cover Images
DROP POLICY IF EXISTS "Users can upload their own cover images" ON storage.objects;
CREATE POLICY "Users can upload their own cover images" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'book-covers' AND (select auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own cover images" ON storage.objects;
CREATE POLICY "Users can delete their own cover images" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'book-covers' AND (select auth.uid())::text = (storage.foldername(name))[1]);

-- ============================================================================
-- PART 2: Fix Function Security Warnings (Add SET search_path)
-- ============================================================================

-- Fix set_updated_at function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix record_anonymous_tts_usage function
CREATE OR REPLACE FUNCTION record_anonymous_tts_usage(
  p_session_id text,
  p_seconds integer,
  p_source text DEFAULT 'reader',
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_month_start date;
  v_session_exists boolean;
  v_total_seconds integer;
BEGIN
  -- Validate inputs
  IF p_session_id IS NULL OR p_session_id = '' THEN
    RAISE EXCEPTION 'session_id is required';
  END IF;
  
  IF p_seconds IS NULL OR p_seconds <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid seconds value');
  END IF;
  
  v_month_start := date_trunc('month', now())::date;
  
  -- Check if session exists
  SELECT EXISTS(
    SELECT 1 FROM anonymous_tts_sessions WHERE session_id = p_session_id
  ) INTO v_session_exists;
  
  -- Create session if it doesn't exist
  IF NOT v_session_exists THEN
    INSERT INTO anonymous_tts_sessions (
      session_id, 
      user_agent,
      total_tts_seconds,
      total_full_cast_seconds
    ) VALUES (
      p_session_id,
      p_user_agent,
      CASE WHEN p_source = 'reader' THEN p_seconds ELSE 0 END,
      CASE WHEN p_source = 'full-cast' THEN p_seconds ELSE 0 END
    );
  ELSE
    -- Update session totals and last_active
    UPDATE anonymous_tts_sessions
    SET 
      last_active_at = now(),
      total_tts_seconds = total_tts_seconds + CASE WHEN p_source = 'reader' THEN p_seconds ELSE 0 END,
      total_full_cast_seconds = total_full_cast_seconds + CASE WHEN p_source = 'full-cast' THEN p_seconds ELSE 0 END
    WHERE session_id = p_session_id;
  END IF;
  
  -- Upsert monthly usage by source
  INSERT INTO anonymous_tts_usage (
    session_id,
    month_start,
    source,
    used_seconds
  ) VALUES (
    p_session_id,
    v_month_start,
    COALESCE(NULLIF(p_source, ''), 'reader'),
    p_seconds
  )
  ON CONFLICT (session_id, month_start, source)
  DO UPDATE SET 
    used_seconds = anonymous_tts_usage.used_seconds + EXCLUDED.used_seconds,
    updated_at = now();
  
  -- Get current total for this session
  SELECT COALESCE(SUM(used_seconds), 0)
  INTO v_total_seconds
  FROM anonymous_tts_usage
  WHERE session_id = p_session_id
    AND month_start = v_month_start;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'total_seconds_this_month', v_total_seconds,
    'total_minutes_this_month', ROUND(v_total_seconds / 60.0, 2)
  );
END;
$$;

-- Fix convert_anonymous_to_user function
CREATE OR REPLACE FUNCTION convert_anonymous_to_user(
  p_session_id text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tts_seconds integer;
  v_full_cast_seconds integer;
  v_month_start date;
BEGIN
  v_month_start := date_trunc('month', now())::date;
  
  -- Get anonymous totals
  SELECT 
    COALESCE(total_tts_seconds, 0),
    COALESCE(total_full_cast_seconds, 0)
  INTO v_tts_seconds, v_full_cast_seconds
  FROM anonymous_tts_sessions
  WHERE session_id = p_session_id;
  
  IF v_tts_seconds IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  -- Mark session as converted
  UPDATE anonymous_tts_sessions
  SET 
    converted_to_user_id = p_user_id,
    conversion_date = now()
  WHERE session_id = p_session_id;
  
  -- Transfer usage to authenticated user tables
  -- Only transfer current month's usage
  INSERT INTO tts_quota_monthly (user_id, month_start, used_seconds)
  VALUES (p_user_id, v_month_start, v_tts_seconds + v_full_cast_seconds)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET 
    used_seconds = tts_quota_monthly.used_seconds + EXCLUDED.used_seconds;
  
  -- Transfer by source
  IF v_tts_seconds > 0 THEN
    INSERT INTO tts_quota_monthly_by_source (user_id, month_start, source, used_seconds)
    VALUES (p_user_id, v_month_start, 'reader', v_tts_seconds)
    ON CONFLICT (user_id, month_start, source)
    DO UPDATE SET 
      used_seconds = tts_quota_monthly_by_source.used_seconds + EXCLUDED.used_seconds;
  END IF;
  
  IF v_full_cast_seconds > 0 THEN
    INSERT INTO tts_quota_monthly_by_source (user_id, month_start, source, used_seconds)
    VALUES (p_user_id, v_month_start, 'full-cast', v_full_cast_seconds)
    ON CONFLICT (user_id, month_start, source)
    DO UPDATE SET 
      used_seconds = tts_quota_monthly_by_source.used_seconds + EXCLUDED.used_seconds;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'tts_seconds_transferred', v_tts_seconds,
    'full_cast_seconds_transferred', v_full_cast_seconds
  );
END;
$$;

