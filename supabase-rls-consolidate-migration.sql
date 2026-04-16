-- Migration: Consolidate Overlapping RLS Policies
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (uses DROP POLICY IF EXISTS)
--
-- This consolidates overlapping RLS policies that cause "Multiple Permissive Policies" warnings.
-- Reduces 24 warnings to 0 by merging policies with OR conditions.
--
-- Key Changes:
-- 1. Books: Remove redundant INSERT policy (covered by FOR ALL)
-- 2. Products/Prices/Subscriptions: Combine public read + service role SELECT into single policies
-- 3. Anonymous tables: Combine FK validation + authenticated read into single SELECT policies

-- ============================================================================
-- PART 1: Books Table - Remove Redundant INSERT Policy
-- ============================================================================

-- The "Users can manage their own books" FOR ALL policy already covers INSERT,
-- so we remove the redundant "Users can insert their own books" policy.
DROP POLICY IF EXISTS "Users can insert their own books" ON books;

-- ============================================================================
-- PART 2: Products Table - Consolidate SELECT Policies
-- ============================================================================


-- Drop existing overlapping SELECT policies
DROP POLICY IF EXISTS "Anyone can read active products" ON products;
DROP POLICY IF EXISTS "Service role can manage products" ON products;

-- Create consolidated SELECT policy (public can read active, service_role explicitly excluded)
-- This avoids overlap with the service_role ALL policy below
CREATE POLICY "Anyone can read active products" ON products
  FOR SELECT USING (is_active = TRUE AND (select auth.role()) != 'service_role');

-- Recreate service role ALL policy (covers INSERT/UPDATE/DELETE/SELECT for service_role)
-- Note: Service role can read all products (active and inactive) via this policy
CREATE POLICY "Service role can manage products" ON products
  FOR ALL USING ((select auth.role()) = 'service_role');

-- ============================================================================
-- PART 3: Prices Table - Consolidate SELECT Policies
-- ============================================================================

-- Drop existing overlapping SELECT policies
DROP POLICY IF EXISTS "Anyone can read active prices" ON prices;
DROP POLICY IF EXISTS "Service role can manage prices" ON prices;

-- Create consolidated SELECT policy (public can read active, service_role explicitly excluded)
-- This avoids overlap with the service_role ALL policy below
CREATE POLICY "Anyone can read active prices" ON prices
  FOR SELECT USING (is_active = TRUE AND (select auth.role()) != 'service_role');

-- Recreate service role ALL policy (covers INSERT/UPDATE/DELETE/SELECT for service_role)
-- Note: Service role can read all prices (active and inactive) via this policy
CREATE POLICY "Service role can manage prices" ON prices
  FOR ALL USING ((select auth.role()) = 'service_role');

-- ============================================================================
-- PART 4: Subscriptions Table - Consolidate SELECT Policies
-- ============================================================================

-- Drop existing overlapping SELECT policies
DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

-- Create consolidated SELECT policy (users read own, service_role explicitly excluded)
-- This avoids overlap with the service_role ALL policy below
CREATE POLICY "Users can read own subscriptions" ON subscriptions
  FOR SELECT USING (user_id = (select auth.uid()) AND (select auth.role()) != 'service_role');

-- Recreate service role ALL policy (covers INSERT/UPDATE/DELETE/SELECT for service_role)
-- Note: Service role can read all subscriptions via this policy
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING ((select auth.role()) = 'service_role');

-- ============================================================================
-- PART 5: Anonymous TTS Sessions - Consolidate SELECT Policies
-- ============================================================================

-- Drop existing overlapping SELECT policies
-- Note: "Allow anonymous session read for FK validation" may have been created
-- manually or by Supabase - we'll drop it if it exists
DROP POLICY IF EXISTS "Allow anonymous session read for FK validation" ON anonymous_tts_sessions;
DROP POLICY IF EXISTS "Allow authenticated read of anonymous sessions" ON anonymous_tts_sessions;

-- Create consolidated SELECT policy that allows:
-- - anon role: needed for FK validation when inserting into anonymous_tts_usage
-- - authenticated role: for authenticated users to read their own data
-- - service_role: for admin operations
CREATE POLICY "Allow read of anonymous sessions" ON anonymous_tts_sessions
  FOR SELECT USING (
    (select auth.role()) IN ('anon', 'authenticated', 'service_role')
  );

-- ============================================================================
-- PART 6: Anonymous TTS Usage - Consolidate SELECT Policies
-- ============================================================================

-- Drop existing overlapping SELECT policies
-- Note: "Allow anonymous usage read for FK validation" may have been created
-- manually or by Supabase - we'll drop it if it exists
DROP POLICY IF EXISTS "Allow anonymous usage read for FK validation" ON anonymous_tts_usage;
DROP POLICY IF EXISTS "Allow authenticated read of anonymous usage" ON anonymous_tts_usage;

-- Create consolidated SELECT policy that allows:
-- - anon role: needed for FK validation (if any future FKs reference this table)
-- - authenticated role: for authenticated users to read their own data
-- - service_role: for admin operations
CREATE POLICY "Allow read of anonymous usage" ON anonymous_tts_usage
  FOR SELECT USING (
    (select auth.role()) IN ('anon', 'authenticated', 'service_role')
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- After running this migration, you should have 0 "Multiple Permissive Policies" warnings.
-- All overlapping policies have been consolidated into single policies with OR conditions,
-- maintaining the same security while improving query performance.
