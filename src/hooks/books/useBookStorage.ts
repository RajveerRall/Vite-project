// src/hooks/books/useBookStorage.ts
// Hook for managing local book storage (LocalForage operations)

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BookData } from '@/types/books';
import { LocalBookRepository } from '../../services/books/repository/LocalBookRepository';
import { DefaultBookService } from '../../services/books/DefaultBookService';

export interface UseBookStorageReturn {
  books: BookData[];
  setBooks: React.Dispatch<React.SetStateAction<BookData[]>>;
  isLoading: boolean;
  isInitialLoadComplete: boolean;
  setIsInitialLoadComplete: React.Dispatch<React.SetStateAction<boolean>>;
  loadBooks: () => Promise<void>;
  saveBooks: (booksToSave: BookData[], cleanupStale?: boolean) => Promise<void>;
}

/**
 * Custom hook for managing book storage operations
 * Handles loading from and saving to LocalForage
 * Extracted from BookContext to separate storage concerns
 */
export function useBookStorage(userId?: string, authInitialized: boolean = false): UseBookStorageReturn {
  const [books, setBooks] = useState<BookData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false);

  // Create repository instance (memoized to prevent recreation)
  const repository = useMemo(
    () => new LocalBookRepository(userId),
    [userId]
  );

  // Track if we've loaded books to prevent reload loops
  const hasLoadedRef = useRef(false);
  const loadingUserIdRef = useRef<string | undefined>(undefined);

  // Load books from storage
  const loadBooks = useCallback(async () => {
    // CRITICAL: Don't load until auth is initialized
    if (!authInitialized) {
      console.log('[useBookStorage] Waiting for auth initialization before loading books');
      return;
    }

    // Prevent reload if we're already loading for this userId
    if (hasLoadedRef.current && loadingUserIdRef.current === userId) {
      console.log(`[useBookStorage] Already loaded for user: ${userId || 'guest'}, skipping reload`);
      return;
    }

    console.log(`[useBookStorage] Loading books for user: ${userId || 'guest'}`);
    const timerName = `[Perf] localforage-load-${userId || 'guest'}-${Date.now()}`;
    console.time(timerName);
    setIsLoading(true);
    loadingUserIdRef.current = userId;

    try {
      // Load books from repository
      const loadedBooks = await repository.loadAllBooks();

      // If no books, ensure default book is available
      if (loadedBooks.length === 0) {
        console.log('[useBookStorage] No books found in storage, fetching default book');
        const defaultBook = await DefaultBookService.loadDefaultBook();
        if (defaultBook) {
          loadedBooks.push(defaultBook);
        }
      }

      setBooks(loadedBooks);
      hasLoadedRef.current = true;
      console.log(`[useBookStorage] Successfully loaded ${loadedBooks.length} books for user: ${userId || 'guest'}`);
    } catch (error) {
      console.error('[useBookStorage] Error loading books:', error);
      setBooks([]);
    } finally {
      console.timeEnd(timerName);
      setIsLoading(false);
      setIsInitialLoadComplete(true);
    }
  }, [repository, userId, authInitialized]);

  // Save books to storage
  const saveBooks = useCallback(
    async (booksToSave: BookData[], cleanupStale: boolean = true) => {
      // Synchronous safety check to prevent saving during an auth transition or before load
      if (!authInitialized || loadingUserIdRef.current !== userId || !hasLoadedRef.current) {
        console.warn('[useBookStorage] Blocking save: books not fully loaded or auth context mismatch', {
          authInitialized,
          currentLoadingId: loadingUserIdRef.current,
          targetUserId: userId,
          hasLoaded: hasLoadedRef.current
        });
        return;
      }

      console.log(`[useBookStorage] Saving ${booksToSave.length} books to storage for user: ${userId || 'guest'}`);
      try {
        await repository.saveAllBooks(booksToSave);
        
        if (cleanupStale) {
          const currentBookIds = new Set(booksToSave.map(b => b.id));
          await repository.cleanupStaleBooks(currentBookIds);
        }

        console.log('[useBookStorage] Books saved successfully');
      } catch (error) {
        console.error('[useBookStorage] Error saving books:', error);
        throw error;
      }
    },
    [repository, userId, authInitialized]
  );

  // Load books on mount and when userId or authInitialized changes
  useEffect(() => {
    // If the userId has changed, reset the load state immediately
    if (loadingUserIdRef.current !== userId) {
      console.log(`[useBookStorage] UserId changed from ${loadingUserIdRef.current} to ${userId}. Resetting load state.`);
      hasLoadedRef.current = false;
      setIsInitialLoadComplete(false);
    }
    
    // Only trigger load once auth is initialized
    if (authInitialized && !hasLoadedRef.current) {
      loadBooks();
    }
  }, [userId, authInitialized, loadBooks]);

  return {
    books,
    setBooks,
    isLoading,
    isInitialLoadComplete,
    setIsInitialLoadComplete,
    loadBooks,
    saveBooks,
  };
}

