// src/hooks/books/useBookLibrary.ts
// Hook for managing book library operations (add/remove)

import { useCallback } from 'react';
import { BookData } from '@/types/books';
import { trackEvent } from '../../lib/analytics';
import { getAdapterForFile } from '../../context/book/formats';
import { generateUUID } from '../../lib/utils';

export interface UseBookLibraryReturn {
  addBook: (file: File) => Promise<BookData>;
  removeBook: (bookId: string) => Promise<void>;
}

/**
 * Custom hook for managing book library operations
 * Handles adding and removing books
 * Extracted from BookContext to separate library management concerns
 */
export function useBookLibrary(
  books: BookData[],
  setBooks: React.Dispatch<React.SetStateAction<BookData[]>>,
  setIsLoading: (loading: boolean) => void,
  isAuthenticated: boolean,
  syncBookToCloud?: (book: BookData) => Promise<void>
): UseBookLibraryReturn {
  // Add a new book to the library
  const addBook = useCallback(
    async (file: File): Promise<BookData> => {
      setIsLoading(true);
      try {
        // Detect and open via registered adapter
        const adapter = await getAdapterForFile(file);
        if (!adapter) {
          throw new Error('Unsupported format. Currently supported: EPUB, PDF, MOBI');
        }

        // Use adapter.open to obtain metadata
        const { meta } = await adapter.open(file);

        const newBook: BookData = {
          id: generateUUID(),
          title: meta.title,
          author: meta.author,
          coverUrl: meta.coverUrl,
          currentPage: 0,
          totalPages: meta.totalPages || 0,
          file,
          lastRead: new Date().toISOString(),
          revision: 0,
        };

        // Update local state immediately for fast UI response
        setBooks(prevBooks => {
          // Check for duplicates
          if (prevBooks.find(b => b.id === newBook.id)) {
            throw new Error(`Book "${newBook.title}" is already in your library.`);
          }
          return [...prevBooks, newBook];
        });

        // Fire-and-forget: warm up Kokoro via microserver to reduce cold starts
        try {
          const baseURL = (import.meta as any).env?.VITE_FULL_CAST_TTS_URL || 'http://localhost:4001';
          const controller = new AbortController();
          setTimeout(() => {
            try {
              controller.abort();
            } catch { }
          }, 2000);
          fetch(`${baseURL}/api/warmup/kokoro`, {
            method: 'POST',
            signal: controller.signal,
          }).catch(() => { });
        } catch { }

        // Sync to cloud if user is authenticated (fire and forget)
        if (isAuthenticated && syncBookToCloud) {
          syncBookToCloud(newBook).catch(error => {
            console.error('[useBookLibrary] Cloud sync failed:', error);
          });
        }

        // Track analytics event
        trackEvent('add_book', {
          method: 'upload',
          book_title: newBook.title,
          book_author: newBook.author || 'Unknown',
          book_id: newBook.id,
          has_cover: !!newBook.coverUrl,
          platform: 'web',
          timestamp: new Date().toISOString(),
        });

        return newBook;
      } catch (error) {
        console.error('[useBookLibrary] Error adding book:', error);
        throw new Error(`Error adding book: ${(error as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [setBooks, setIsLoading, isAuthenticated, syncBookToCloud]
  );

  // Remove a book from the library
  const removeBook = useCallback(
    async (bookId: string): Promise<void> => {
      const bookToRemove = books.find(b => b.id === bookId);

      // Revoke blob URL if exists
      if (bookToRemove?.coverUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(bookToRemove.coverUrl);
      }

      // Track analytics event
      trackEvent('remove_book', {
        book_title: bookToRemove?.title || 'Unknown',
        book_author: bookToRemove?.author || 'Unknown',
        book_id: bookId,
        had_cover: !!bookToRemove?.coverUrl,
        platform: 'web',
        timestamp: new Date().toISOString(),
      });

      console.log(`[useBookLibrary] Removing book ID: ${bookId}`);

      // Remove from local state
      setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
    },
    [books, setBooks]
  );

  return {
    addBook,
    removeBook,
  };
}

