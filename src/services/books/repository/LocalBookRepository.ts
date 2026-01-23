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
   * Load all books from local storage
   * Regenerates cover URLs since blob URLs don't persist across page reloads
   */
  async loadAllBooks(): Promise<BookData[]> {
    console.log('[LocalBookRepository] Loading books from storage');
    const timerName = `[Perf] localforage-load-all-${Date.now()}`;
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

          // Regenerate cover URL since blob URLs don't persist
          const freshCoverUrl = await regenerateCoverUrl(file);
          const bookWithFreshCover: BookData = {
            ...metadata,
            file,
            coverUrl: freshCoverUrl || metadata.coverUrl,
          };

          console.log(
            `[LocalBookRepository] Cover regenerated for "${metadata.title}": ${freshCoverUrl ? 'Success' : 'Failed'}`
          );

          loadedBooks.push(bookWithFreshCover);
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
   * Save a single book to local storage
   */
  async saveBook(book: BookData): Promise<void> {
    try {
      const { file, ...metadata } = book;
      const metadataKey = this.getMetadataKey(book.id);
      const fileKey = this.getFileKey(book.id);

      await localforage.setItem(metadataKey, metadata);
      await localforage.setItem(fileKey, file);

      console.log(
        `[LocalBookRepository] Saved book: ${metadata.title}, page: ${metadata.currentPage}, chapter: ${metadata.lastChapter?.label || 'none'}`
      );
    } catch (error) {
      console.error(`[LocalBookRepository] Error saving book ${book.id}:`, error);
      throw error;
    }
  }

  /**
   * Save multiple books to local storage
   */
  async saveAllBooks(books: BookData[]): Promise<void> {
    console.log(`[LocalBookRepository] Saving ${books.length} books`);
    try {
      for (const book of books) {
        await this.saveBook(book);
      }
      console.log('[LocalBookRepository] All books saved successfully');
    } catch (error) {
      console.error('[LocalBookRepository] Error saving books:', error);
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
      await localforage.removeItem(metadataKey);
      await localforage.removeItem(fileKey);

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

      for (const key of allKeys) {
        if (key.startsWith(metadataPrefix) || key.startsWith(filePrefix)) {
          const bookId = key.replace(metadataPrefix, '').replace(filePrefix, '');

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
          (key.includes('book_metadata_') || key.includes('book_file_'))
      );

      // Also clear non-user-specific book keys when signed out
      const allBookKeys = allKeys.filter(
        key => key.includes('book_metadata_') || key.includes('book_file_')
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

