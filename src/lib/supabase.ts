import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create Supabase client with auth enabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface BookRecord {
  id: string
  user_id: string
  title: string
  author?: string
  current_page: number
  last_chapter?: string
  total_pages: number
  last_read: string
  file_url?: string
  cover_url?: string | null
  created_at: string
  updated_at: string
}

// Helper function to get file download URL
export const getFileUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Helper function to upload file
export const uploadFile = async (
  bucket: string, 
  path: string, 
  file: File | Blob
) => {
  console.log(`[SupabaseUpload] Uploading to bucket: ${bucket}, path: ${path}`)
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    })
  
  if (error) {
    console.error(`[SupabaseUpload] Error uploading to ${bucket}/${path}:`, error)
    throw error
  }
  
  console.log(`[SupabaseUpload] Successfully uploaded to ${bucket}/${path}`)
  return data
}

// Helper function to delete file
export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
} 