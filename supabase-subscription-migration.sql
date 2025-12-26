-- Subscription System Migration - Phase 1
-- This file contains only the subscription-related schema changes
-- Safe to run multiple times (uses IF NOT EXISTS and CREATE OR REPLACE)
-- Run this in Supabase SQL Editor

-- === SUBSCRIPTION SYSTEM ===

-- Create profiles table if it doesn't exist (Supabase may auto-create)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID,
  customer_id TEXT, -- Payment gateway customer ID (e.g., Stripe customer ID)
  tts_minutes_limit INTEGER DEFAULT 0,
  tts_minutes_used INTEGER DEFAULT 0,
  last_reset_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- RLS policies for profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_id ON profiles(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON profiles(customer_id) WHERE customer_id IS NOT NULL;

-- Add updated_at trigger for profiles (assuming set_updated_at function already exists)
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'trial', 'cancelled', 'past_due')),
  plan_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_gateway_subscription_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

-- RLS policies for subscriptions
CREATE POLICY "Users can read own subscriptions" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_id ON subscriptions(payment_gateway_subscription_id) WHERE payment_gateway_subscription_id IS NOT NULL;

-- Add updated_at trigger for subscriptions
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tts_minutes_included INTEGER NOT NULL DEFAULT 0,
  price_per_month INTEGER,
  currency TEXT DEFAULT 'usd',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active products" ON products;
DROP POLICY IF EXISTS "Service role can manage products" ON products;

-- RLS policies for products (public read, admin write)
CREATE POLICY "Anyone can read active products" ON products
  FOR SELECT USING (is_active = TRUE OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage products" ON products
  FOR ALL USING (auth.role() = 'service_role');

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_gateway_id ON products(gateway_product_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Add updated_at trigger for products
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create prices table
CREATE TABLE IF NOT EXISTS prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  gateway_price_id TEXT UNIQUE NOT NULL,
  unit_amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  interval_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on prices
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active prices" ON prices;
DROP POLICY IF EXISTS "Service role can manage prices" ON prices;

-- RLS policies for prices
CREATE POLICY "Anyone can read active prices" ON prices
  FOR SELECT USING (is_active = TRUE OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage prices" ON prices
  FOR ALL USING (auth.role() = 'service_role');

-- Indexes for prices
CREATE INDEX IF NOT EXISTS idx_prices_gateway_id ON prices(gateway_price_id);
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_is_active ON prices(is_active);

-- Add updated_at trigger for prices
DROP TRIGGER IF EXISTS trg_prices_updated_at ON prices;
CREATE TRIGGER trg_prices_updated_at
  BEFORE UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add foreign key from profiles to subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_subscription_id_fkey'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_subscription_id_fkey 
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RPC function to check TTS usage limit
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
  v_seconds_used INTEGER;
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

  -- Fetch user's subscription and limit info
  SELECT 
    p.tts_minutes_limit,
    p.tts_minutes_used,
    p.last_reset_date,
    s.current_period_end
  INTO 
    v_minutes_limit,
    v_seconds_used,
    v_last_reset_date,
    v_current_period_end
  FROM profiles p
  LEFT JOIN subscriptions s ON s.id = p.subscription_id
  WHERE p.id = v_user_id;

  -- If profile doesn't exist, create it with default limits
  IF v_minutes_limit IS NULL THEN
    INSERT INTO profiles (id, tts_minutes_limit, tts_minutes_used)
    VALUES (v_user_id, 0, 0)
    ON CONFLICT (id) DO NOTHING;
    
    SELECT tts_minutes_limit, tts_minutes_used, last_reset_date
    INTO v_minutes_limit, v_seconds_used, v_last_reset_date
    FROM profiles
    WHERE id = v_user_id;
  END IF;

  -- Convert seconds to minutes
  v_minutes_used := COALESCE(v_seconds_used, 0) / 60;

  -- Check if reset is needed based on subscription period
  IF v_current_period_end IS NOT NULL AND v_last_reset_date IS NOT NULL THEN
    IF v_last_reset_date < v_current_period_end AND NOW() >= v_current_period_end THEN
      v_needs_reset := TRUE;
    END IF;
  ELSIF v_last_reset_date IS NULL THEN
    -- First time check, set reset date
    v_needs_reset := TRUE;
  END IF;

  -- Calculate remaining minutes
  IF v_minutes_limit > 0 THEN
    v_minutes_remaining := GREATEST(0, v_minutes_limit - v_minutes_used);
    v_limit_exceeded := v_minutes_remaining <= 0;
  ELSE
    -- No limit set (unlimited or free tier)
    v_minutes_remaining := NULL;
    v_limit_exceeded := FALSE;
  END IF;

  RETURN jsonb_build_object(
    'has_limit', v_minutes_limit > 0,
    'minutes_limit', v_minutes_limit,
    'minutes_used', v_minutes_used,
    'minutes_remaining', v_minutes_remaining,
    'limit_exceeded', v_limit_exceeded,
    'needs_reset', v_needs_reset,
    'last_reset_date', v_last_reset_date,
    'current_period_end', v_current_period_end
  );
END;
$$;

-- RPC function to reset user TTS usage
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

  -- Reset usage in profiles
  UPDATE profiles
  SET 
    tts_minutes_used = 0,
    last_reset_date = NOW(),
    updated_at = NOW()
  WHERE id = v_user_id;

  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO profiles (id, tts_minutes_limit, tts_minutes_used, last_reset_date)
    VALUES (v_user_id, 0, 0, NOW())
    ON CONFLICT (id) DO UPDATE
    SET tts_minutes_used = 0, last_reset_date = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'reset_at', NOW(),
    'reason', p_reset_reason
  );
END;
$$;

-- RPC function to get user subscription info
CREATE OR REPLACE FUNCTION get_user_subscription_info(
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile JSONB;
  v_subscription JSONB;
  v_product JSONB;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User ID is required');
  END IF;

  -- Get profile info
  SELECT jsonb_build_object(
    'tts_minutes_limit', p.tts_minutes_limit,
    'tts_minutes_used', p.tts_minutes_used,
    'last_reset_date', p.last_reset_date
  )
  INTO v_profile
  FROM profiles p
  WHERE p.id = v_user_id;

  -- Get subscription info
  SELECT jsonb_build_object(
    'id', s.id,
    'status', s.status,
    'plan_id', s.plan_id,
    'current_period_start', s.current_period_start,
    'current_period_end', s.current_period_end,
    'cancel_at_period_end', s.cancel_at_period_end,
    'payment_gateway_subscription_id', s.payment_gateway_subscription_id
  )
  INTO v_subscription
  FROM subscriptions s
  WHERE s.user_id = v_user_id
    AND s.status IN ('active', 'trial')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Get product info if subscription exists
  IF v_subscription IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'tts_minutes_included', p.tts_minutes_included,
      'price_per_month', p.price_per_month,
      'currency', p.currency
    )
    INTO v_product
    FROM subscriptions sub
    JOIN products p ON p.gateway_product_id = sub.plan_id
    WHERE sub.user_id = v_user_id
      AND sub.status IN ('active', 'trial')
    ORDER BY sub.created_at DESC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'profile', COALESCE(v_profile, jsonb_build_object()),
    'subscription', v_subscription,
    'product', v_product
  );
END;
$$;

-- Update increment_tts_usage to check limits and update profiles
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
  v_seconds_to_add INTEGER;
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
  ELSE
    -- Get current usage from profile
    SELECT COALESCE(tts_minutes_used, 0)
    INTO v_seconds_used
    FROM profiles
    WHERE id = v_user_id;
  END IF;

  -- Check if adding seconds would exceed limit (if limit exists)
  IF v_minutes_limit > 0 THEN
    v_seconds_to_add := p_seconds;
    IF (v_seconds_used + v_seconds_to_add) / 60 > v_minutes_limit THEN
      RAISE EXCEPTION 'TTS_USAGE_LIMIT_EXCEEDED: TTS usage limit exceeded. Please upgrade your subscription.' USING 
        DETAIL = format('Current usage: %s minutes, Limit: %s minutes', 
                       (v_seconds_used / 60), v_minutes_limit),
        HINT = 'PROUE01';
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

  -- Update profiles table with new usage
  IF v_event_inserted OR p_event_id IS NULL THEN
    INSERT INTO profiles (id, tts_minutes_used, updated_at)
    VALUES (v_user_id, v_seconds_used + p_seconds, NOW())
    ON CONFLICT (id) DO UPDATE
    SET 
      tts_minutes_used = profiles.tts_minutes_used + p_seconds,
      updated_at = NOW();
  END IF;
END;
$$;

-- Helper function to get subscription status
CREATE OR REPLACE FUNCTION get_subscription_status(p_user_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN 'no_user';
  END IF;

  SELECT status INTO v_status
  FROM subscriptions
  WHERE user_id = v_user_id
    AND status IN ('active', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_status, 'inactive');
END;
$$;

-- Helper function to calculate usage reset date
CREATE OR REPLACE FUNCTION calculate_usage_reset_date(p_user_id UUID DEFAULT NULL)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT current_period_end INTO v_period_end
  FROM subscriptions
  WHERE user_id = v_user_id
    AND status IN ('active', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_period_end;
END;
$$;

-- Migration complete!
-- You can verify by running:
-- SELECT check_tts_usage_limit(auth.uid());
-- SELECT get_user_subscription_info(auth.uid());
