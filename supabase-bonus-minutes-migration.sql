-- Migration: Add bonus minutes feature for anonymous users
-- Allows users to get 1 hour of bonus listening time by answering a question

-- Add columns to anonymous_tts_sessions table
ALTER TABLE anonymous_tts_sessions 
ADD COLUMN IF NOT EXISTS has_answered_question BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bonus_minutes_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS question_answer TEXT;

-- Create user_feedback table to store question answers
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES anonymous_tts_sessions(session_id),
  user_id UUID REFERENCES auth.users(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for session_id lookups
CREATE INDEX IF NOT EXISTS idx_user_feedback_session_id ON user_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS on user_feedback
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert their own feedback
CREATE POLICY "Allow anonymous feedback insert" 
  ON user_feedback FOR INSERT 
  WITH CHECK (true);

-- Allow authenticated users to read their own feedback
CREATE POLICY "Allow authenticated read of own feedback" 
  ON user_feedback FOR SELECT 
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Allow service role to read all feedback (for analytics)
CREATE POLICY "Allow service role to read all feedback" 
  ON user_feedback FOR SELECT 
  USING (auth.role() = 'service_role');

