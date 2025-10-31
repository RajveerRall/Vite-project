// src/hooks/books/useBookSync.ts
// Hook for managing cloud sync operations

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookData } from '@/types/books';
import { CloudBookRepository, CloudBookRecord } from '../../services/books/repository/CloudBookRepository';
import { BookSyncService } from '../../services/books/BookSyncService';
import { DefaultBookService } from '../../services/books/DefaultBookService';

export interface UseBookSyncReturn {
  isSyncingFromCloud: boolean;
  syncBooks: (localBooks: BookData[]) => Promise<BookData[]>;
  syncBookToCloud: (book: BookData) => Promise<void>;
  syncProgressToCloud: (bookId: string, currentPage: number, lastChapter: any) => Promise<void>;
  removeBookFromCloud: (bookId: string) => Promise<void>;
}

/**
 * Custom hook for managing cloud sync operations
 * Handles syncing books to/from Supabase
 * Extracted from BookContext to separate cloud sync concerns
 */
export function useBookSync(
  userId: string | undefined,
  isAuthenticated: boolean,
  isInitialLoadComplete: boolean
): UseBookSyncReturn {
  const [isSyncingFromCloud, setIsSyncingFromCloud] = useState<boolean>(false);

  // Create repository instance when user is authenticated (memoized)
  const cloudRepository = useMemo(() => {
    if (!userId) return null;
    return new CloudBookRepository(userId);
  }, [userId]);

  // Sync a single book to cloud
  const syncBookToCloud = useCallback(
    async (book: BookData) => {
      if (!isAuthenticated || !userId || !cloudRepository) return;

      try {
        await cloudRepository.syncBookToCloud(book);
      } catch (error) {
        console.error('[useBookSync] Error syncing book to cloud:', error);
        // Don't throw - allow local save even if cloud sync fails
      }
    },
    [isAuthenticated, userId, cloudRepository]
  );

  // Sync reading progress to cloud
  const syncProgressToCloud = useCallback(
    async (bookId: string, currentPage: number, lastChapter: any) => {
      if (!isAuthenticated || !userId || !cloudRepository) return;

      try {
        await cloudRepository.updateBookProgress(bookId, currentPage, lastChapter);
        console.log(`[useBookSync] Updated progress for book ${bookId}: page ${currentPage}`);
      } catch (error) {
        console.error('[useBookSync] Error syncing progress:', error);
      }
    },
    [isAuthenticated, userId, cloudRepository]
  );

  // Remove book from cloud
  const removeBookFromCloud = useCallback(
    async (bookId: string) => {
      if (!isAuthenticated || !userId || !cloudRepository) return;

      try {
        await cloudRepository.deleteBook(bookId);
        console.log(`[useBookSync] Removed book ${bookId} from cloud`);
      } catch (error) {
        console.error('[useBookSync] Error removing book from cloud:', error);
      }
    },
    [isAuthenticated, userId, cloudRepository]
  );

  // Sync books from cloud (progressive download)
  const syncBooks = useCallback(
    async (localBooks: BookData[]): Promise<BookData[]> => {
      if (!isAuthenticated || !userId || !cloudRepository) {
        return localBooks;
      }

      // CRITICAL: Wait for initial load to complete before syncing
      if (!isInitialLoadComplete) {
        console.log('[useBookSync] Waiting for initial load to complete before syncing...');
        return localBooks;
      }

      try {
        console.log('[useBookSync] 🚀 Starting sync - User authenticated:', { userId });
        setIsSyncingFromCloud(true);

        // Fetch books from cloud
        const cloudBooks = await cloudRepository.fetchUserBooks();

        console.log(`[useBookSync] Retrieved ${cloudBooks.length} books from Supabase`);

        if (cloudBooks.length === 0) {
          console.log('[useBookSync] No cloud books to sync');
          setIsSyncingFromCloud(false);
          return localBooks;
        }

        // Use BookSyncService to handle progressive sync
        const { updatedBooks, placeholderBooks, downloadPromises } =
          await BookSyncService.syncBooksProgressive(
            localBooks,
            cloudBooks,
            cloudRepository,
            (completed, total) => {
              console.log(`[useBookSync] Progress: ${completed}/${total} books downloaded`);
            }
          );

        // Start with updated books + placeholders
        let currentBooks = [...updatedBooks, ...placeholderBooks];

        // Process downloads as they complete
        const downloadResults = await Promise.all(downloadPromises);
        
        downloadResults.forEach(downloadedBook => {
          if (downloadedBook) {
            currentBooks = BookSyncService.processDownloadedBooks(
              currentBooks,
              downloadedBook
            );
          }
        });

        // Ensure default book is available
        const defaultBook = await DefaultBookService.ensureDefaultBookAvailable(
          currentBooks
        );
        if (defaultBook && !DefaultBookService.findDefaultBook(currentBooks)) {
          currentBooks.push(defaultBook);
        }

        const totalTime = performance.now();
        console.log(`[useBookSync] 🎉 Sync complete`);
        console.log(
          `[useBookSync] 📊 Results: ${downloadResults.filter(Boolean).length} new books downloaded`
        );

        setIsSyncingFromCloud(false);
        return currentBooks;
      } catch (error) {
        console.error('[useBookSync] Progressive sync failed:', error);
        setIsSyncingFromCloud(false);
        return localBooks;
      }
    },
    [isAuthenticated, userId, cloudRepository, isInitialLoadComplete]
  );

  return {
    isSyncingFromCloud,
    syncBooks,
    syncBookToCloud,
    syncProgressToCloud,
    removeBookFromCloud,
  };
}

