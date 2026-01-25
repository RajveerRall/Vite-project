// src/services/books/repository/CloudBookRepository.ts
// Repository for cloud storage operations using Supabase

import { BookData, TOCItem } from '@/types/books';
import JSZip from 'jszip';

// Lightweight interface to avoid importing supabase client at startup
export interface CloudBookRecord {
  id: string;
  user_id: string;
  title: string;
  author?: string;
  current_page: number;
  last_chapter?: string | null;
  total_pages: number;
  progress?: number;
  last_read: string;
  file_url?: string | null;
  cover_url?: string | null;
  revision?: number;
}

/**
 * Repository for managing books in cloud storage (Supabase)
 * Extracted from BookContext to separate cloud sync concerns
 */
export class CloudBookRepository {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Fetch all books for the current user from Supabase
   * Uses REST API directly (like SubscriptionService) for reliability
   * This bypasses Supabase client session initialization issues
   */
  async fetchUserBooks(): Promise<CloudBookRecord[]> {
    console.log('[CloudBookRepository] Fetching user books from Supabase...', { userId: this.userId });

    try {
      // Use REST API directly (like SubscriptionService) - more reliable than client
      const { getAccessToken } = await import('../../../lib/authToken');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
      }

      // Get access token (with timeout protection)
      console.log('[CloudBookRepository] Getting access token...');
      let accessToken: string;
      try {
        accessToken = await getAccessToken(5000);
      } catch (tokenError) {
        console.error('[CloudBookRepository] Failed to get access token:', tokenError);
        throw new Error('No access token available - please sign in again');
      }

      if (!accessToken) {
        throw new Error('No access token available');
      }

      console.log('[CloudBookRepository] Using REST API for books fetch...');

      // Build PostgREST query URL using URLSearchParams (consistent with SubscriptionService)
      const url = `${supabaseUrl}/rest/v1/books`;
      const params = new URLSearchParams();
      params.append('select', '*');
      params.append('user_id', `eq.${this.userId}`);
      params.append('order', 'last_read.desc');

      const fullUrl = `${url}?${params.toString()}`;
      console.log(`[CloudBookRepository] REST API URL: ${fullUrl.substring(0, 150)}...`);

      // Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout

      try {
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[CloudBookRepository] HTTP ${response.status}:`, errorText);

          // Provide helpful error messages
          if (response.status === 401) {
            throw new Error('Authentication failed - please sign in again');
          } else if (response.status === 403) {
            throw new Error('Permission denied - check RLS policies');
          } else {
            throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
          }
        }

        const data = await response.json();
        console.log(`[CloudBookRepository] Successfully fetched ${data?.length || 0} books via REST API`);
        return (data || []) as CloudBookRecord[];

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout after 10 seconds - check network connection');
        }
        throw fetchError;
      }

    } catch (error) {
      console.error('[CloudBookRepository] Error fetching user books:', error);

      // Enhanced error logging
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          console.error('[CloudBookRepository] Query timed out - possible network or RLS issue');
        } else if (error.message.includes('permission denied') ||
          error.message.includes('RLS') ||
          error.message.includes('policy') ||
          error.message.includes('403')) {
          console.error('[CloudBookRepository] RLS policy issue detected - check auth.uid()::text in policies');
        } else if (error.message.includes('401') || error.message.includes('Authentication')) {
          console.error('[CloudBookRepository] Authentication issue - session may have expired');
        }
      }

      throw error;
    }
  }

  /**
   * Upload a book file to Supabase Storage
   */
  async uploadBookFile(bookId: string, file: File): Promise<string> {
    const { uploadFile, getFileUrl } = await import('../../../lib/supabase');
    const fileName = `${bookId}.epub`;
    const filePath = `${this.userId}/${fileName}`;

    await uploadFile('book-files', filePath, file);
    return getFileUrl('book-files', filePath);
  }

  /**
   * Upload a cover image to Supabase Storage
   */
  async uploadCoverImage(bookId: string, coverBlob: Blob): Promise<string> {
    const { uploadFile, getFileUrl } = await import('../../../lib/supabase');
    const coverPath = `${this.userId}/${bookId}-cover.jpg`;

    await uploadFile('book-covers', coverPath, coverBlob);
    return getFileUrl('book-covers', coverPath);
  }

  /**
   * Save book metadata to Supabase database
   */
  async saveBookMetadata(book: BookData, fileUrl: string, coverUrl?: string | null): Promise<void> {
    const { supabase } = await import('../../../lib/supabase');

    const bookRecord = {
      id: book.id,
      user_id: this.userId,
      title: book.title,
      author: book.author || '',
      current_page: book.currentPage,
      last_chapter:
        typeof book.lastChapter === 'string'
          ? book.lastChapter
          : book.lastChapter?.href || '',
      total_pages: book.totalPages,
      last_read: book.lastRead,
      progress: book.progress || 0,
      revision: book.revision || 0,
      file_url: fileUrl,
      cover_url: coverUrl || undefined,
    };

    const { error } = await supabase.from('books').upsert(bookRecord as any, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Supabase database error: ${error.message}`);
    }
  }

  /**
   * Sync a book to cloud (upload file, cover, and metadata)
   */
  async syncBookToCloud(book: BookData): Promise<void> {
    try {
      console.log(`[CloudBookRepository] Starting sync for "${book.title}"`);

      // Upload EPUB file
      const fileUrl = await this.uploadBookFile(book.id, book.file);

      // Upload cover if available
      let coverUrl: string | null = null;
      if (book.coverUrl && book.coverUrl.startsWith('blob:')) {
        try {
          const coverBlob = await fetch(book.coverUrl).then(r => r.blob());
          coverUrl = await this.uploadCoverImage(book.id, coverBlob);
        } catch (coverError) {
          console.warn('[CloudBookRepository] Could not upload cover:', coverError);
        }
      }

      // Save metadata
      await this.saveBookMetadata(book, fileUrl, coverUrl);

      console.log(`[CloudBookRepository] Successfully synced "${book.title}" to Supabase`);
    } catch (error) {
      console.error('[CloudBookRepository] Error syncing book to cloud:', error);
      throw error;
    }
  }

  /**
   * Update book progress in cloud
   */
  async updateBookProgress(
    bookId: string,
    currentPage: number,
    lastChapter: TOCItem | string | null,
    progress: number = 0,
    revision?: number
  ): Promise<void> {
    const { supabase } = await import('../../../lib/supabase');

    const lastChapterStr =
      typeof lastChapter === 'string'
        ? lastChapter
        : lastChapter?.href || '';

    const updateData: any = {
      current_page: currentPage,
      last_chapter: lastChapterStr,
      progress: progress,
      last_read: new Date().toISOString(),
    };

    if (revision !== undefined) {
      updateData.revision = revision;
    }

    const { error } = await supabase
      .from('books')
      .update(updateData)
      .eq('user_id', this.userId)
      .eq('id', bookId);

    if (error) {
      throw new Error(`Supabase update error: ${error.message}`);
    }
  }

  /**
   * Delete a book from cloud storage and database
   */
  async deleteBook(bookId: string): Promise<void> {
    const { supabase, deleteFile } = await import('../../../lib/supabase');

    // Get book info for file cleanup
    const { data: bookData } = await supabase
      .from('books')
      .select('file_url, cover_url')
      .eq('user_id', this.userId)
      .eq('id', bookId)
      .single();

    if (bookData) {
      // Delete files from storage
      if (bookData.file_url) {
        const filePath = `${this.userId}/${bookId}.epub`;
        await deleteFile('book-files', filePath);
      }
      if (bookData.cover_url) {
        const coverPath = `${this.userId}/${bookId}-cover.jpg`;
        await deleteFile('book-covers', coverPath);
      }
    }

    // Delete database record
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('user_id', this.userId)
      .eq('id', bookId);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }

  /**
   * Download a book file from Supabase Storage
   * Uses direct fetch() instead of supabase.storage.download() to avoid hanging
   * Handles multiple download strategies for reliability
   */
  async downloadBookFile(
    cloudBook: CloudBookRecord,
    possibleBuckets: string[] = ['book-files']
  ): Promise<Blob> {
    const startTime = performance.now();
    console.log(`[CloudBookRepository] Starting download for: "${cloudBook.title}"`);

    let fileData: Blob | null = null;
    let successfulBucket = '';
    let downloadMethod = '';

    // Strategy 1: Try using file_url from database (direct fetch)
    if (cloudBook.file_url) {
      try {
        let correctedUrl = cloudBook.file_url;

        // Remove image quality parameters
        if (correctedUrl.includes('?quality=')) {
          correctedUrl = correctedUrl.split('?')[0];
        }

        // Fix wrong endpoint from /render/image/public/ to /object/
        if (correctedUrl.includes('/render/image/public/')) {
          correctedUrl = correctedUrl.replace('/render/image/public/', '/object/');
        }

        console.log(`[CloudBookRepository] Trying direct fetch from file_url...`);

        // Use direct fetch with timeout (faster and more reliable than client)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for large files

        try {
          const response = await fetch(correctedUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/octet-stream, */*',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const blob = await response.blob();
            if (blob.size > 0) {
              fileData = blob;
              successfulBucket = 'file_url';
              downloadMethod = 'direct_fetch_url';
              console.log(`[CloudBookRepository] ✅ Downloaded via file_url: ${blob.size} bytes`);
            }
          } else {
            console.log(`[CloudBookRepository] file_url fetch failed: ${response.status}`);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.log('[CloudBookRepository] file_url fetch timeout');
          } else {
            console.log('[CloudBookRepository] file_url fetch error:', fetchError.message);
          }
        }
      } catch (urlError) {
        console.log('[CloudBookRepository] Failed using file_url:', urlError);
      }
    }

    // Strategy 2: Try direct fetch using public URL (if bucket is public)
    if (!fileData || fileData.size === 0) {
      for (const bucket of possibleBuckets) {
        try {
          const downloadPath = `${this.userId}/${cloudBook.id}.epub`;

          // Get public URL first (works for public buckets)
          const { getFileUrl } = await import('../../../lib/supabase');
          const publicUrl = getFileUrl(bucket, downloadPath);

          console.log(`[CloudBookRepository] Trying public URL for bucket ${bucket}: ${downloadPath}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            const response = await fetch(publicUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/octet-stream, */*',
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const blob = await response.blob();
              if (blob.size > 0) {
                fileData = blob;
                successfulBucket = bucket;
                downloadMethod = 'public_url';
                console.log(`[CloudBookRepository] ✅ Downloaded from public URL (${bucket}): ${blob.size} bytes`);
                break;
              }
            } else if (response.status === 404) {
              // Not found, try next bucket
              console.log(`[CloudBookRepository] File not found in bucket ${bucket}`);
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name !== 'AbortError') {
              console.log(`[CloudBookRepository] Public URL fetch failed for ${bucket}:`, fetchError.message);
            }
          }
        } catch (bucketError) {
          console.log(`[CloudBookRepository] Error with bucket ${bucket}:`, bucketError);
          continue;
        }
      }
    }

    // Strategy 3: Fallback to Supabase Storage REST API with auth (for private buckets)
    if (!fileData || fileData.size === 0) {
      console.log('[CloudBookRepository] Direct fetch failed, trying Storage REST API...');

      for (const bucket of possibleBuckets) {
        try {
          const downloadPath = `${this.userId}/${cloudBook.id}.epub`;
          const { getAccessToken } = await import('../../../lib/authToken');
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const accessToken = await getAccessToken(5000);
          const storageUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${downloadPath}`;

          console.log(`[CloudBookRepository] Trying Storage REST API for bucket ${bucket}...`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            const response = await fetch(storageUrl, {
              method: 'GET',
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/octet-stream, */*',
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const blob = await response.blob();
              if (blob.size > 0) {
                fileData = blob;
                successfulBucket = bucket;
                downloadMethod = 'storage_rest_api';
                console.log(`[CloudBookRepository] ✅ Downloaded via Storage REST API (${bucket}): ${blob.size} bytes`);
                break;
              }
            } else {
              console.log(`[CloudBookRepository] Storage REST API failed: ${response.status}`);
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name !== 'AbortError') {
              console.log(`[CloudBookRepository] Storage REST API error:`, fetchError.message);
            }
          }
        } catch (bucketError) {
          console.log(`[CloudBookRepository] Storage REST API failed for ${bucket}:`, bucketError);
          continue;
        }
      }
    }

    // Strategy 4: Last resort - Supabase client (with timeout)
    if (!fileData || fileData.size === 0) {
      console.log('[CloudBookRepository] Trying Supabase client storage as last resort...');

      for (const bucket of possibleBuckets) {
        try {
          const downloadPath = `${this.userId}/${cloudBook.id}.epub`;
          const { supabase } = await import('../../../lib/supabase');

          const downloadPromise = supabase.storage
            .from(bucket)
            .download(downloadPath);

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Storage download timeout after 30s')), 30000);
          });

          const result = await Promise.race([downloadPromise, timeoutPromise]) as any;
          const { data, error } = result;

          if (!error && data && data.size > 0) {
            fileData = data;
            successfulBucket = bucket;
            downloadMethod = 'client_storage';
            console.log(`[CloudBookRepository] ✅ Downloaded via client storage (${bucket}): ${data.size} bytes`);
            break;
          } else if (error) {
            console.log(`[CloudBookRepository] Client storage error for ${bucket}:`, error.message);
          }
        } catch (bucketError: any) {
          if (!bucketError.message.includes('timeout')) {
            console.log(`[CloudBookRepository] Client storage failed for ${bucket}:`, bucketError.message);
          }
          continue;
        }
      }
    }

    if (!fileData || fileData.size === 0) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      throw new Error(`All download methods failed for book: "${cloudBook.title}" (tried for ${elapsed}s)`);
    }

    // Validate file size
    if (fileData.size < 1000) {
      throw new Error(
        `File too small (${fileData.size} bytes), likely corrupted`
      );
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[CloudBookRepository] ✅ Successfully downloaded "${cloudBook.title}" (${fileData.size} bytes) via ${downloadMethod} in ${elapsed}s`
    );

    return fileData;
  }

  /**
   * Extract cover from downloaded EPUB file
   */
  async extractCoverFromFile(file: File): Promise<string | null> {
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);

      // Try different cover extraction methods
      const coverBlob = await (async () => {
        // Method 1: Look for cover.jpg/cover.png in root
        for (const name of ['cover.jpg', 'cover.jpeg', 'cover.png']) {
          const coverFile = loadedZip.file(name);
          if (coverFile) {
            return await coverFile.async('blob');
          }
        }

        // Method 2: Look in common directories
        for (const dir of [
          'images/',
          'Images/',
          'OEBPS/images/',
          'OEBPS/Images/',
        ]) {
          for (const name of ['cover.jpg', 'cover.jpeg', 'cover.png']) {
            const coverFile = loadedZip.file(dir + name);
            if (coverFile) {
              return await coverFile.async('blob');
            }
          }
        }

        return null;
      })();

      if (coverBlob) {
        return URL.createObjectURL(coverBlob);
      }

      return null;
    } catch (coverError) {
      console.warn('[CloudBookRepository] Could not extract cover:', coverError);
      return null;
    }
  }

  /**
   * Convert CloudBookRecord to BookData format
   */
  convertCloudBookToBookData(
    cloudBook: CloudBookRecord,
    file: File,
    coverUrl: string | null = null
  ): BookData {
    return {
      id: cloudBook.id,
      title: cloudBook.title || 'Unknown Title',
      author: cloudBook.author || 'Unknown Author',
      file,
      coverUrl: cloudBook.cover_url || coverUrl,
      currentPage: cloudBook.current_page || 0,
      lastChapter: cloudBook.last_chapter
        ? {
          id: 'restored-chapter',
          href: cloudBook.last_chapter,
          label:
            cloudBook.last_chapter.split('/').pop()?.replace('.html', '') ||
            'Chapter',
          children: [],
        }
        : null,
      totalPages: cloudBook.total_pages || 0,
      lastRead: cloudBook.last_read || new Date().toISOString(),
      progress: cloudBook.progress || 0,
      revision: cloudBook.revision || 0,
      isDownloading: false,
    };
  }
}

