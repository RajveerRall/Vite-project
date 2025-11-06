// src/hooks/reader/useReaderUI.ts
// Hook for managing Reader UI state (modals, highlights, navigation arrows, etc.)

import { useState, useEffect, useCallback, useRef } from 'react';
import { BookData, TOCItem } from '../../types/books';
import {
  FEATURE_HIGHLIGHT_DELAY,
  PROGRESSIVE_ENHANCEMENT_DELAY,
  NAVIGATION_ARROWS_TIMEOUT,
} from '../../constants/readerConstants';
import { 
  findChapterForPage, 
  isLastPageOfChapter, 
  findNextChapter, 
  findPrevChapter 
} from '../../utils/chapterUtils';
import { throttle } from '../../utils/throttle';

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
  showPrevArrow: boolean;
  showNextArrow: boolean;
  handlePageClick: () => void;

  // Progressive enhancement
  isEnhanced: boolean;
}

interface UseReaderUIProps {
  currentBook: BookData | null;
  toc: TOCItem[];
  currentPageDisplay: number;
  htmlFiles: string[];
  contentRef: React.RefObject<HTMLElement>;
}

/**
 * Custom hook for managing Reader UI state
 * Handles modals, feature highlights, navigation arrows, and progressive enhancement
 */
export function useReaderUI({
  currentBook,
  toc,
  currentPageDisplay,
  htmlFiles,
  contentRef,
}: UseReaderUIProps): UseReaderUIReturn {
  // Video Quote Modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [selectedTextForVideo, setSelectedTextForVideo] = useState<string>('');

  // Feature highlight state
  const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(false);

  // Navigation arrows state
  const [showNavigationArrows, setShowNavigationArrows] = useState<boolean>(false);
  const [showPrevArrow, setShowPrevArrow] = useState<boolean>(false);
  const [showNextArrow, setShowNextArrow] = useState<boolean>(false);
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

  // Check if we're at the end of a chapter and show arrows accordingly
  const checkChapterEnd = useCallback(() => {
    if (!contentRef.current || !toc || toc.length === 0 || !htmlFiles || htmlFiles.length === 0) {
      setShowNavigationArrows(false);
      setShowPrevArrow(false);
      setShowNextArrow(false);
      return;
    }

    const scrollContainer = contentRef.current;
    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;
    
    // Calculate distance from bottom
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const threshold = 100; // Show arrows when within 100px of bottom
    
    // Check if we're near the bottom
    const isNearBottom = distanceFromBottom <= threshold;
    
    if (!isNearBottom) {
      setShowNavigationArrows(false);
      setShowPrevArrow(false);
      setShowNextArrow(false);
      return;
    }

    // Find current chapter
    const currentChapter = findChapterForPage(currentPageDisplay, toc, htmlFiles);
    
    if (!currentChapter) {
      setShowNavigationArrows(false);
      setShowPrevArrow(false);
      setShowNextArrow(false);
      return;
    }

    // Check if we're at the last page of the current chapter
    const isLastPage = isLastPageOfChapter(currentPageDisplay, currentChapter, toc, htmlFiles);
    
    if (!isLastPage) {
      setShowNavigationArrows(false);
      setShowPrevArrow(false);
      setShowNextArrow(false);
      return;
    }

    // Find next and previous chapters
    const nextChapter = findNextChapter(currentChapter, toc);
    const prevChapter = findPrevChapter(currentChapter, toc);

    // Show arrows if we're at the end of chapter and there are adjacent chapters
    const shouldShowArrows = isLastPage && (!!nextChapter || !!prevChapter);
    
    setShowNavigationArrows(shouldShowArrows);
    setShowPrevArrow(shouldShowArrows && !!prevChapter);
    setShowNextArrow(shouldShowArrows && !!nextChapter);
  }, [contentRef, toc, currentPageDisplay, htmlFiles]);

  // Monitor scroll position to detect end of chapter
  useEffect(() => {
    if (!contentRef.current || !toc || toc.length === 0) {
      return;
    }

    const scrollContainer = contentRef.current;
    const handleScroll = throttle(() => {
      checkChapterEnd();
    }, 150);

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check initial state
    const timeoutId = setTimeout(() => {
      checkChapterEnd();
    }, 500); // Delay to allow content to render

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [contentRef, checkChapterEnd, toc, currentPageDisplay, htmlFiles]);

  // Also check when page changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkChapterEnd();
    }, 500); // Delay to allow new page to render
    
    return () => clearTimeout(timeoutId);
  }, [currentPageDisplay, checkChapterEnd]);

  // Navigation arrows handlers
  const handlePageClick = useCallback(() => {
    // Keep the old behavior for manual page clicks
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
    showPrevArrow,
    showNextArrow,
    handlePageClick,
    isEnhanced,
  };
}

