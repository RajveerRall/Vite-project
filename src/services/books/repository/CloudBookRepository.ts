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
  last_read: string;
  file_url?: string | null;
  cover_url?: string | null;
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
   */
  async fetchUserBooks(): Promise<CloudBookRecord[]> {
    const { supabase } = await import('../../../lib/supabase');
    
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', this.userId)
      .order('last_read', { ascending: false });

    if (error) {
      throw new Error(`Supabase fetch error: ${error.message}`);
    }

    return (data || []) as CloudBookRecord[];
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
    lastChapter: TOCItem | string | null
  ): Promise<void> {
    const { supabase } = await import('../../../lib/supabase');
    
    const lastChapterStr =
      typeof lastChapter === 'string'
        ? lastChapter
        : lastChapter?.href || '';

    const { error } = await supabase
      .from('books')
      .update({
        current_page: currentPage,
        last_chapter: lastChapterStr,
        last_read: new Date().toISOString(),
      })
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
   * Handles multiple download strategies for reliability
   */
  async downloadBookFile(
    cloudBook: CloudBookRecord,
    possibleBuckets: string[] = ['book-files']
  ): Promise<Blob> {
    let fileData: Blob | null = null;
    let successfulBucket = '';

    // Strategy 1: Try using file_url from database
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

        // Extract bucket and path from URL
        const url = new URL(correctedUrl);
        const pathParts = url.pathname.split('/');
        const objectIndex = pathParts.findIndex(part => part === 'object');

        if (objectIndex !== -1 && objectIndex + 1 < pathParts.length) {
          const bucketFromUrl = pathParts[objectIndex + 1];
          const pathFromUrl = pathParts.slice(objectIndex + 2).join('/');

          if (bucketFromUrl && pathFromUrl) {
            const { supabase } = await import('../../../lib/supabase');
            const { data, error } = await supabase.storage
              .from(bucketFromUrl)
              .download(pathFromUrl);

            if (!error && data && data.size > 0) {
              fileData = data;
              successfulBucket = bucketFromUrl;
              console.log(
                `[CloudBookRepository] Downloaded using file_url from bucket: ${bucketFromUrl}`
              );
            }
          }
        }
      } catch (urlError) {
        console.log('[CloudBookRepository] Failed using file_url:', urlError);
      }
    }

    // Strategy 2: Fallback to standard bucket path
    if (!fileData || fileData.size === 0) {
      for (const bucket of possibleBuckets) {
        try {
          const downloadPath = `${this.userId}/${cloudBook.id}.epub`;
          const { supabase } = await import('../../../lib/supabase');
          const { data, error } = await supabase.storage
            .from(bucket)
            .download(downloadPath);

          if (!error && data && data.size > 0) {
            fileData = data;
            successfulBucket = bucket;
            console.log(`[CloudBookRepository] Downloaded from bucket: ${bucket}`);
            break;
          }
        } catch (bucketError) {
          console.log(`[CloudBookRepository] Failed with bucket ${bucket}:`, bucketError);
          continue;
        }
      }
    }

    if (!fileData || fileData.size === 0) {
      throw new Error(`All download methods failed for book: ${cloudBook.title}`);
    }

    // Validate file size
    if (fileData.size < 1000) {
      throw new Error(
        `File too small (${fileData.size} bytes), likely corrupted`
      );
    }

    console.log(
      `[CloudBookRepository] Successfully downloaded "${cloudBook.title}" from bucket: ${successfulBucket}`
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
      isDownloading: false,
    };
  }
}

