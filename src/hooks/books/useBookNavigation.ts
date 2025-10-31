// src/hooks/books/useBookNavigation.ts
// Hook for managing page navigation and URL synchronization

import { useEffect, useRef } from 'react';
import { BookData } from '@/types/books';
import { trackEvent } from '../../lib/analytics';
import { saveReaderState } from '../../utils/readerState';

export interface UseBookNavigationReturn {
  // Navigation is handled by setters in BookContext
  // This hook just manages URL sync and analytics
}

/**
 * Custom hook for managing page navigation
 * Handles URL synchronization and analytics tracking
 * Extracted from BookContext to separate navigation concerns
 */
export function useBookNavigation(
  isReading: boolean,
  currentBook: BookData | null,
  currentPageDisplay: number,
  totalPages: number
): UseBookNavigationReturn {
  // Track previous values to prevent unnecessary updates and re-renders
  const prevPageRef = useRef<number | null>(null);
  const prevBookIdRef = useRef<string | null>(null);

  // Synchronize URL with current page - only when page actually changes
  useEffect(() => {
    if (isReading && currentBook && currentPageDisplay >= 0) {
      const pageChanged = prevPageRef.current !== currentPageDisplay;
      const bookChanged = prevBookIdRef.current !== currentBook.id;

      // Only update if page or book actually changed (prevents unnecessary re-renders during TTS)
      if (pageChanged || bookChanged) {
        // Update URL without navigation (replaceState prevents history spam)
        const newUrl = `/reader/${currentBook.id}?page=${currentPageDisplay}`;
        window.history.replaceState({}, '', newUrl);

        // Save to localStorage for state restoration
        saveReaderState({
          bookId: currentBook.id,
          page: currentPageDisplay,
          timestamp: Date.now(),
          bookTitle: currentBook.title,
        });

        // Track page change for analytics - only on actual page changes, not on every render
        if (pageChanged) {
          trackEvent('page_navigation', {
            method: 'page_change',
            book_id: currentBook.id,
            book_title: currentBook.title,
            page_number: currentPageDisplay,
            total_pages: totalPages,
          });
        }

        // Update refs
        prevPageRef.current = currentPageDisplay;
        prevBookIdRef.current = currentBook.id;
      }
    } else {
      // Reset refs when not reading
      prevPageRef.current = null;
      prevBookIdRef.current = null;
    }
  }, [currentPageDisplay, currentBook, isReading, totalPages]);

  return {};
}

