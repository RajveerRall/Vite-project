// src/hooks/reader/useReaderUI.ts
// Hook for managing Reader UI state (modals, highlights, navigation arrows, etc.)

import { useState, useEffect, useCallback, useRef } from 'react';
import { BookData } from '../../types/books';
import {
  FEATURE_HIGHLIGHT_DELAY,
  PROGRESSIVE_ENHANCEMENT_DELAY,
  NAVIGATION_ARROWS_TIMEOUT,
} from '../../constants/readerConstants';

export interface UseReaderUIReturn {
  // Modal states
  isVideoModalOpen: boolean;
  selectedTextForVideo: string;
  openVideoModal: (text: string) => void;
  closeVideoModal: () => void;

  // Feature highlight
  showFeatureHighlight: boolean;
  closeFeatureHighlight: () => void;

  // Navigation arrows
  showNavigationArrows: boolean;
  handlePageClick: () => void;

  // Progressive enhancement
  isEnhanced: boolean;
}

/**
 * Custom hook for managing Reader UI state
 * Handles modals, feature highlights, navigation arrows, and progressive enhancement
 */
export function useReaderUI(currentBook: BookData | null): UseReaderUIReturn {
  // Video Quote Modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [selectedTextForVideo, setSelectedTextForVideo] = useState<string>('');

  // Feature highlight state
  const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(false);

  // Navigation arrows state
  const [showNavigationArrows, setShowNavigationArrows] = useState<boolean>(false);
  const arrowsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Progressive enhancement state
  const [isEnhanced, setIsEnhanced] = useState<boolean>(false);

  // Check if this is the first time opening this book
  const isFirstOpen =
    !currentBook?.lastRead ||
    Date.now() - new Date(currentBook.lastRead).getTime() < 5000;

  // Defer feature highlight to improve initial load performance
  useEffect(() => {
    if (isFirstOpen) {
      const timer = setTimeout(() => setShowFeatureHighlight(true), FEATURE_HIGHLIGHT_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isFirstOpen]);

  // Progressive loading: show basic reader first, enhance progressively
  useEffect(() => {
    const timer = setTimeout(() => setIsEnhanced(true), PROGRESSIVE_ENHANCEMENT_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Video modal handlers
  const openVideoModal = useCallback((text: string) => {
    setSelectedTextForVideo(text);
    setIsVideoModalOpen(true);
  }, []);

  const closeVideoModal = useCallback(() => {
    setIsVideoModalOpen(false);
    setSelectedTextForVideo('');
  }, []);

  // Feature highlight handler
  const closeFeatureHighlight = useCallback(() => {
    setShowFeatureHighlight(false);
  }, []);

  // Navigation arrows handlers
  const handlePageClick = useCallback(() => {
    setShowNavigationArrows(true);
    if (arrowsTimeoutRef.current) {
      clearTimeout(arrowsTimeoutRef.current);
    }
    arrowsTimeoutRef.current = setTimeout(() => {
      setShowNavigationArrows(false);
    }, NAVIGATION_ARROWS_TIMEOUT);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (arrowsTimeoutRef.current) {
        clearTimeout(arrowsTimeoutRef.current);
      }
    };
  }, []);

  return {
    isVideoModalOpen,
    selectedTextForVideo,
    openVideoModal,
    closeVideoModal,
    showFeatureHighlight,
    closeFeatureHighlight,
    showNavigationArrows,
    handlePageClick,
    isEnhanced,
  };
}

