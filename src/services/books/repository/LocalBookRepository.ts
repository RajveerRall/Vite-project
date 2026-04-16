// src/services/books/repository/LocalBookRepository.ts
// Repository for local storage operations using LocalForage

import localforage from 'localforage';
import { BookData } from '@/types/books';
import { regenerateCoverUrl } from '../../../context/book/storage';
import { DefaultBookService } from '../DefaultBookService';

// Configure LocalForage once
localforage.config({
  name: 'EbookReaderApp',
  storeName: 'bookStorage',
});

/**
 * Repository for managing books in local storage (LocalForage)
 * Extracted from BookContext to separate storage concerns
 */
export class LocalBookRepository {
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * Get the storage key prefix based on user ID
   */
  private getKeyPrefix(): string {
    return this.userId ? `user_${this.userId}_` : '';
  }

  /**
   * Get metadata key for a book
   */
  private getMetadataKey(bookId: string): string {
    const prefix = this.getKeyPrefix();
    return prefix ? `${prefix}book_metadata_${bookId}` : `book_metadata_${bookId}`;
  }

  /**
   * Get file key for a book
   */
  private getFileKey(bookId: string): string {
    const prefix = this.getKeyPrefix();
    return prefix ? `${prefix}book_file_${bookId}` : `book_file_${bookId}`;
  }

  /**
   * Get cover key for a book
   */
  private getCoverKey(bookId: string): string {
    const prefix = this.getKeyPrefix();
    return prefix ? `${prefix}book_cover_${bookId}` : `book_cover_${bookId}`;
  }

  /**
   * Load all books from local storage
   * Uses cached covers if available, otherwise regenerates and caches them
   */
  async loadAllBooks(): Promise<BookData[]> {
    const prefix = this.getKeyPrefix();
    console.log(`[LocalBookRepository] Loading books for prefix: "${prefix || 'GUEST'}"`);
    const timerName = `[Perf] localforage-load-${prefix || 'guest'}-${Date.now()}`;
    console.time(timerName);

    try {
      const keys = await localforage.keys();
      const prefix = this.getKeyPrefix();
      const metadataPrefix = prefix ? `${prefix}book_metadata_` : 'book_metadata_';

      const bookMetadataKeys = keys.filter(key => key.startsWith(metadataPrefix));
      console.log(
        `[LocalBookRepository] Found ${bookMetadataKeys.length} books with prefix: "${metadataPrefix}"`
      );

      const loadedBooks: BookData[] = [];

      for (const key of bookMetadataKeys) {
        const bookId = key.replace(metadataPrefix, '');
        const metadata = (await localforage.getItem(key)) as BookData;
        const fileKey = this.getFileKey(bookId);
        const file = (await localforage.getItem(fileKey)) as File;

        if (metadata && file) {
          console.log(
            `[LocalBookRepository] Loaded: ${metadata.title}, page: ${metadata.currentPage}, chapter: ${metadata.lastChapter?.label || 'none'}`
          );

          // Try to get cached cover blob first
          const coverKey = this.getCoverKey(bookId);
          const cachedCoverBlob = (await localforage.getItem(coverKey)) as Blob | null;
          let freshCoverUrl: string | null = null;

          if (cachedCoverBlob) {
            freshCoverUrl = URL.createObjectURL(cachedCoverBlob);
            // console.log(`[LocalBookRepository] Used cached cover for "${metadata.title}"`);
          } else {
            // Regenerate cover URL from file (slow)
            const rawCoverUrl = await regenerateCoverUrl(file);
            if (rawCoverUrl) {
              // Fetch blob from the created object URL to store it
              try {
                const response = await fetch(rawCoverUrl);
                const blob = await response.blob();
                await localforage.setItem(coverKey, blob);
                freshCoverUrl = rawCoverUrl;
                console.log(`[LocalBookRepository] Regenerated and cached cover for "${metadata.title}"`);
              } catch (e) {
                console.warn(`[LocalBookRepository] Failed to cache cover for "${metadata.title}"`, e);
                freshCoverUrl = rawCoverUrl;
              }
            } else {
              console.log(`[LocalBookRepository] Fast cover generation failed for "${metadata.title}"`);
            }
          }

          const bookWithCover: BookData = {
            ...metadata,
            file,
            coverUrl: freshCoverUrl || metadata.coverUrl,
          };

          loadedBooks.push(bookWithCover);
        }
      }

      console.timeEnd(timerName);
      console.log(
        `[LocalBookRepository] Successfully loaded ${loadedBooks.length} books`
      );
      return loadedBooks;
    } catch (error) {
      console.error('[LocalBookRepository] Error loading books:', error);
      console.timeEnd(timerName);
      return [];
    }
  }

  /**
   * Get a single book's file from local storage
   */
  async getBookFile(bookId: string): Promise<File | null> {
    try {
      const fileKey = this.getFileKey(bookId);
      const file = (await localforage.getItem(fileKey)) as File;
      return file || null;
    } catch (error) {
      console.error(`[LocalBookRepository] Error getting book file ${bookId}:`, error);
      return null;
    }
  }

  /**
   * Save multiple books to local storage
   */
  async saveAllBooks(books: BookData[]): Promise<void> {
    const prefix = this.getKeyPrefix();
    console.log(`[LocalBookRepository] Saving ${books.length} books with prefix: "${prefix || 'GUEST'}"`);
    
    // Safety check: Don't allow saving empty books if we are in a user context that was expected to have books
    if (this.userId && books.length === 0) {
      console.warn(`[LocalBookRepository] Attempting to save EMPTY book list for user: ${this.userId}. Potential race condition!`);
    } else {
      console.log(`[LocalBookRepository] Saving ${books.length} books for ${this.userId || 'guest'} (Prefix: "${prefix || 'GUEST'}")`);
    }

    try {
      const timerName = `[Perf] save-all-${Date.now()}`;
      console.time(timerName);
      
      for (const book of books) {
        await this.saveBook(book);
      }
      
      console.timeEnd(timerName);
      console.log(`[LocalBookRepository] All ${books.length} books saved successfully for ${this.userId || 'guest'}`);
    } catch (error) {
      console.error('[LocalBookRepository] Error saving books:', error);
      throw error;
    }
  }

  /**
   * Save a single book to local storage
   */
  async saveBook(book: BookData): Promise<void> {
    try {
      const { file, ...metadata } = book;
      const metadataKey = this.getMetadataKey(book.id);
      const fileKey = this.getFileKey(book.id);

      // 1. Save metadata and file
      await localforage.setItem(metadataKey, metadata);
      await localforage.setItem(fileKey, file);

      // 2. Cache cover if present and is a blob URL
      if (book.coverUrl && book.coverUrl.startsWith('blob:')) {
        try {
          const coverKey = this.getCoverKey(book.id);
          const response = await fetch(book.coverUrl);
          if (response.ok) {
            const blob = await response.blob();
            await localforage.setItem(coverKey, blob);
          }
        } catch (e) {
          console.warn(`[LocalBookRepository] Failed to cache cover on save for "${book.title}"`, e);
        }
      }

      console.log(
        `[LocalBookRepository] Persisted: ${metadata.title} (ID: ${book.id}) to ${metadataKey}`
      );
    } catch (error) {
      console.error(`[LocalBookRepository] Error saving book ${book.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a book from local storage
   * Never removes the default book (1984)
   */
  async removeBook(bookId: string): Promise<void> {
    try {
      // Check if this is the default book before removing
      const metadataKey = this.getMetadataKey(bookId);
      const metadata = (await localforage.getItem(metadataKey)) as BookData | null;

      if (metadata && DefaultBookService.isDefaultBook(metadata)) {
        console.log(`[LocalBookRepository] Preserving default book: ${metadata.title}`);
        return;
      }

      const fileKey = this.getFileKey(bookId);
      const coverKey = this.getCoverKey(bookId);
      await localforage.removeItem(metadataKey);
      await localforage.removeItem(fileKey);
      await localforage.removeItem(coverKey);

      console.log(`[LocalBookRepository] Removed book: ${bookId}`);
    } catch (error) {
      console.error(`[LocalBookRepository] Error removing book ${bookId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up stale books (books that are no longer in the provided list)
   * Never removes the default book
   */
  async cleanupStaleBooks(currentBookIds: Set<string>): Promise<void> {
    try {
      const allKeys = await localforage.keys();
      const prefix = this.getKeyPrefix();
      const metadataPrefix = prefix ? `${prefix}book_metadata_` : 'book_metadata_';
      const filePrefix = prefix ? `${prefix}book_file_` : 'book_file_';
      const coverPrefix = prefix ? `${prefix}book_cover_` : 'book_cover_';
      
      console.log(`[LocalBookRepository] Cleaning up stale books for prefix: "${prefix || 'GUEST'}"`);

      for (const key of allKeys) {
        if (key.startsWith(metadataPrefix) || key.startsWith(filePrefix) || key.startsWith(coverPrefix)) {
          const bookId = key.replace(metadataPrefix, '').replace(filePrefix, '').replace(coverPrefix, '');

          // Skip if book still exists
          if (currentBookIds.has(bookId)) {
            continue;
          }

          // Check if this is the default book - preserve it
          if (key.startsWith(metadataPrefix)) {
            const metadata = (await localforage.getItem(key)) as BookData | null;
            if (metadata && DefaultBookService.isDefaultBook(metadata)) {
              console.log(`[LocalBookRepository] Preserving default book: ${metadata.title}`);
              continue;
            }
          }

          console.log(`[LocalBookRepository] Removing stale book key: ${key}`);
          await localforage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('[LocalBookRepository] Error cleaning up stale books:', error);
    }
  }

  /**
   * Clear all books from local storage (used on sign out)
   * Preserves the default book
   */
  async clearAllBooks(): Promise<void> {
    try {
      const allKeys = await localforage.keys();
      const userKeys = allKeys.filter(
        key =>
          key.startsWith('user_') &&
          (key.includes('book_metadata_') || key.includes('book_file_') || key.includes('book_cover_'))
      );

      // Also clear non-user-specific book keys when signed out
      const allBookKeys = allKeys.filter(
        key => key.includes('book_metadata_') || key.includes('book_file_') || key.includes('book_cover_')
      );

      for (const key of [...userKeys, ...allBookKeys]) {
        // Check if this is the default book - preserve it
        if (key.startsWith('book_metadata_')) {
          const metadata = (await localforage.getItem(key)) as BookData | null;
          if (metadata && DefaultBookService.isDefaultBook(metadata)) {
            console.log(`[LocalBookRepository] Preserving default book: ${metadata.title}`);
            continue;
          }
        }

        await localforage.removeItem(key);
        console.log(`[LocalBookRepository] Removed key: ${key}`);
      }

      console.log('[LocalBookRepository] All books cleared (except default)');
    } catch (error) {
      console.error('[LocalBookRepository] Error clearing books:', error);
      throw error;
    }
  }
}

