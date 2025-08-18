-- Supabase Database Schema for Ebook Reader
-- Run this in your Supabase SQL Editor

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  current_page INTEGER DEFAULT 0,
  last_chapter TEXT,
  total_pages INTEGER DEFAULT 0,
  last_read TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_url TEXT, -- Supabase Storage URL for EPUB file
  cover_url TEXT, -- Supabase Storage URL for cover image
  file_size BIGINT, -- File size in bytes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only access their own books
CREATE POLICY "Users can manage their own books" ON books
  FOR ALL 
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create policy for authenticated users to insert their own books
CREATE POLICY "Users can insert their own books" ON books
  FOR INSERT 
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read DESC);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_books_updated_at 
  BEFORE UPDATE ON books 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for book files
INSERT INTO storage.buckets (id, name, public) VALUES ('book-files', 'book-files', false);

-- Create storage bucket for cover images  
INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true);

-- Storage policies for book files
CREATE POLICY "Users can upload their own book files" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'book-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own book files" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'book-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own book files" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'book-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for cover images (public readable)
CREATE POLICY "Users can upload their own cover images" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view cover images" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'book-covers');

CREATE POLICY "Users can delete their own cover images" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]); 