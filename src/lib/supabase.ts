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

// Helper function to get file download URL with CDN optimization
export const getFileUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
    transform: {
      // Add CDN optimization for better performance
      quality: 100,
    }
  })
  return data.publicUrl
}

// Enhanced download function with optimal performance
export const downloadFileOptimized = async (bucket: string, path: string): Promise<Blob> => {
  try {
    // Method 1: Direct CDN URL (fastest, best browser compatibility)
    const publicUrl = getFileUrl(bucket, path);
    
    console.log(`[SupabaseOptimized] Trying CDN download: ${path}`);
    
    const response = await fetch(publicUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream, */*',
        'Cache-Control': 'max-age=31536000', // 1 year cache
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': navigator.userAgent // Help with Edge compatibility
      },
      // Use aggressive caching for repeat downloads
      cache: 'force-cache'
    });

    if (response.ok) {
      const contentLength = response.headers.get('content-length');
      const blob = await response.blob();
      
      if (blob.size > 0) {
        console.log(`[SupabaseOptimized] CDN success: ${path} (${blob.size} bytes, ${contentLength ? `expected ${contentLength}` : 'no content-length'})`);
        return blob;
      }
    }

    console.log(`[SupabaseOptimized] CDN failed (${response.status}: ${response.statusText}), trying Supabase client: ${path}`);
    
    // Method 2: Supabase client fallback
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error || !data || data.size === 0) {
      throw new Error(`All download methods failed: ${error?.message || 'No data or empty file'}`);
    }

    console.log(`[SupabaseOptimized] Client fallback success: ${path} (${data.size} bytes)`);
    return data;
    
  } catch (error) {
    console.error(`[SupabaseOptimized] Download failed for ${path}:`, error);
    throw error;
  }
};

// Helper function to upload file with optimized settings
export const uploadFile = async (
  bucket: string, 
  path: string, 
  file: File | Blob
) => {
  console.log(`[SupabaseUpload] Uploading to bucket: ${bucket}, path: ${path} (${file.size} bytes)`)
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '31536000', // 1 year cache (books rarely change)
      upsert: true,
      duplex: 'half' // Better streaming performance for large files
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