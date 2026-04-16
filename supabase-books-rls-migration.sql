-- Migration: Update Books Table RLS Policies to use auth.uid()
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (uses DROP POLICY IF EXISTS)
-- 
-- This fixes the sync loader hanging issue by updating books table RLS policies
-- to use the modern auth.uid() method instead of the deprecated current_setting()
-- method, matching the pattern used in subscription tables.

-- Drop old policies
DROP POLICY IF EXISTS "Users can manage their own books" ON books;
DROP POLICY IF EXISTS "Users can insert their own books" ON books;

-- Create new policies using auth.uid() (modern, reliable method)
-- Note: auth.uid() returns UUID, but user_id is TEXT, so we convert with ::text
-- Wrapped in subquery for performance: evaluates once per query instead of per row
CREATE POLICY "Users can manage their own books" ON books
  FOR ALL 
  USING (user_id = (select auth.uid())::text);

CREATE POLICY "Users can insert their own books" ON books
  FOR INSERT 
  WITH CHECK (user_id = (select auth.uid())::text);

