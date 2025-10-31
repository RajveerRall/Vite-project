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
export function useBookStorage(userId?: string): UseBookStorageReturn {
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
    // Prevent reload if we're already loading for this userId
    if (hasLoadedRef.current && loadingUserIdRef.current === userId) {
      console.log('[useBookStorage] Already loaded for this user, skipping reload');
      return;
    }

    console.log('[useBookStorage] Loading books from storage');
    const timerName = `[Perf] localforage-load-${Date.now()}`;
    console.time(timerName);
    setIsLoading(true);
    loadingUserIdRef.current = userId;

    try {
      // Load books from repository
      let loadedBooks = await repository.loadAllBooks();

      // If no books and user not authenticated, ensure default book is available
      if (!userId && loadedBooks.length === 0) {
        console.log('[useBookStorage] No books loaded, ensuring default book is available');
        const defaultBook = await DefaultBookService.loadDefaultBook();
        if (defaultBook) {
          loadedBooks.push(defaultBook);
        }
      }

      setBooks(loadedBooks);
      hasLoadedRef.current = true;
      console.log(`[useBookStorage] Successfully loaded ${loadedBooks.length} books`);
    } catch (error) {
      console.error('[useBookStorage] Error loading books:', error);
      setBooks([]);
    } finally {
      console.timeEnd(timerName);
      setIsLoading(false);
      setIsInitialLoadComplete(true);
    }
  }, [repository, userId]);

  // Save books to storage
  const saveBooks = useCallback(
    async (booksToSave: BookData[], cleanupStale: boolean = true) => {
      console.log(`[useBookStorage] Saving ${booksToSave.length} books to storage`);
      try {
        await repository.saveAllBooks(booksToSave);
        
        if (cleanupStale) {
          const currentBookIds = new Set(booksToSave.map(b => b.id));
          await repository.cleanupStaleBooks(currentBookIds);
        }

        console.log('[useBookStorage] Books saved successfully');
        // Don't reload after save - let the state update naturally
      } catch (error) {
        console.error('[useBookStorage] Error saving books:', error);
        throw error;
      }
    },
    [repository]
  );

  // Load books on mount and when userId changes (but not on every render)
  useEffect(() => {
    // Reset load flag when userId changes
    if (loadingUserIdRef.current !== userId) {
      hasLoadedRef.current = false;
      loadingUserIdRef.current = undefined;
    }
    
    if (!hasLoadedRef.current) {
      loadBooks();
    }
  }, [userId, loadBooks]);

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

