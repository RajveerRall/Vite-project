// src/hooks/reader/useReaderNavigation.ts
// Hook for managing Reader navigation actions with TTS coordination

import { useCallback } from 'react';
import { TOCItem } from '../../types/books';

export interface UseReaderNavigationReturn {
  handleNavigateToTocItem: (item: TOCItem) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handleCloseBook: () => void;
  handleChapterNavigation: (direction: 'prev' | 'next') => void;
}

interface NavigationDependencies {
  // TTS navigation
  handleTTSNavigation: () => void;
  
  // Book context navigation
  navigateToTocItem: (item: TOCItem) => Promise<void>;
  prevPage: () => void;
  nextPage: () => void;
  closeBook: (resetGlobalLoading?: boolean) => void;
}

/**
 * Custom hook for managing Reader navigation actions
 * Coordinates TTS navigation with book navigation
 */
export function useReaderNavigation(
  deps: NavigationDependencies
): UseReaderNavigationReturn {
  const {
    handleTTSNavigation,
    navigateToTocItem,
    prevPage,
    nextPage,
    closeBook,
  } = deps;

  const handleNavigateToTocItem = useCallback(
    (item: TOCItem) => {
      handleTTSNavigation();
      navigateToTocItem(item);
    },
    [handleTTSNavigation, navigateToTocItem]
  );

  const handlePrevPage = useCallback(() => {
    handleTTSNavigation();
    prevPage();
  }, [handleTTSNavigation, prevPage]);

  const handleNextPage = useCallback(() => {
    handleTTSNavigation();
    nextPage();
  }, [handleTTSNavigation, nextPage]);

  const handleCloseBook = useCallback(() => {
    handleTTSNavigation();
    closeBook();
  }, [handleTTSNavigation, closeBook]);

  const handleChapterNavigation = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        handlePrevPage();
      } else {
        handleNextPage();
      }
      // Scroll to top after navigation
      setTimeout(() => {
        const readerMain = document.querySelector('.reader-main');
        if (readerMain) {
          readerMain.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }
      }, 100);
    },
    [handlePrevPage, handleNextPage]
  );

  return {
    handleNavigateToTocItem,
    handlePrevPage,
    handleNextPage,
    handleCloseBook,
    handleChapterNavigation,
  };
}

