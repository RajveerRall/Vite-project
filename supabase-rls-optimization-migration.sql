-- RLS Policy Optimization Migration
-- Fixes performance warnings from Supabase linter
-- Run this in Supabase SQL Editor

-- ============================================
-- Fix prepaid_transactions RLS policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own prepaid transactions" ON prepaid_transactions;
DROP POLICY IF EXISTS "Service role can manage prepaid transactions" ON prepaid_transactions;

-- Recreate with optimized auth.uid() calls using SELECT
CREATE POLICY "Users can read own prepaid transactions" ON prepaid_transactions
  FOR SELECT 
  USING (user_id = (SELECT auth.uid()));

-- Service role policy (unchanged, but using SELECT for consistency)
CREATE POLICY "Service role can manage prepaid transactions" ON prepaid_transactions
  FOR ALL 
  USING ((SELECT auth.role()) = 'service_role');

-- ============================================
-- Fix profiles RLS policies (if they have similar issues)
-- ============================================

-- Note: Check if profiles table has similar auth.uid() issues
-- If so, update them similarly:
-- DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
-- CREATE POLICY "Users can read own profile" ON profiles
--   FOR SELECT USING (id = (SELECT auth.uid()));

-- ============================================
-- Combine multiple permissive policies where possible
-- ============================================

-- For prepaid_transactions: Combine user read and service role into single policy
-- This eliminates the multiple permissive policies warning
-- However, we need separate policies for different roles, so we'll use a combined USING clause

-- Drop and recreate with combined conditions
DROP POLICY IF EXISTS "Users can read own prepaid transactions" ON prepaid_transactions;
DROP POLICY IF EXISTS "Service role can manage prepaid transactions" ON prepaid_transactions;

-- Optimized combined policy for SELECT
CREATE POLICY "prepaid_transactions_select_policy" ON prepaid_transactions
  FOR SELECT 
  USING (
    user_id = (SELECT auth.uid()) OR 
    (SELECT auth.role()) = 'service_role'
  );

-- Service role can do all operations
CREATE POLICY "Service role can manage prepaid transactions" ON prepaid_transactions
  FOR ALL 
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- Note: This reduces from 2 SELECT policies to 1 for most roles
-- Service role still needs separate policy for ALL operations

-- ============================================
-- Verify the changes
-- ============================================

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'prepaid_transactions'
ORDER BY policyname;

-- ============================================
-- Note about Leaked Password Protection
-- ============================================
-- 
-- The "Leaked Password Protection Disabled" warning is an Auth setting
-- that must be enabled in the Supabase Dashboard, not via SQL:
-- 
-- 1. Go to: Supabase Dashboard → Authentication → Settings
-- 2. Scroll to "Password Security" section
-- 3. Enable "Check for leaked passwords" (HaveIBeenPwned integration)
-- 
-- This cannot be fixed via SQL migration - it's a dashboard setting.

