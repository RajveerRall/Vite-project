// src/hooks/useAutoScrollToNextPage.ts
// Hook for auto-loading next/previous page when scrolling to bottom/top (useful for PDFs with many pages)

import { useEffect, useRef } from 'react';
import { throttle } from '../utils/throttle';

interface UseAutoScrollToNextPageOptions {
  enabled: boolean; // Whether auto-scroll is enabled (e.g., for PDFs)
  contentRef: React.RefObject<HTMLElement>;
  currentPage: number;
  totalPages: number;
  nextPage: () => void;
  prevPage: () => void; // Previous page navigation
  isPageLoading: boolean; // Prevent loading while page is already loading
  threshold?: number; // Distance from bottom/top to trigger (default: 20px)
  onScrollStateChange?: (state: { nearTop: boolean; nearBottom: boolean; canGoPrev: boolean; canGoNext: boolean }) => void; // Callback for scroll state changes
}

/**
 * Hook that automatically loads the next/previous page when user scrolls to the bottom/top
 * Useful for PDFs and other formats where pages are loaded individually
 */
export function useAutoScrollToNextPage({
  enabled,
  contentRef,
  currentPage,
  totalPages,
  nextPage,
  prevPage,
  isPageLoading,
  threshold = 20, // Trigger when within 20px of bottom/top
  onScrollStateChange,
}: UseAutoScrollToNextPageOptions): void {
  const hasTriggeredNextRef = useRef<boolean>(false);
  const hasTriggeredPrevRef = useRef<boolean>(false);
  const lastPageRef = useRef<number>(currentPage);
  const lastTriggerTimeRef = useRef<number>(0);
  const previousScrollTopRef = useRef<number>(0);
  const lastWheelDirectionRef = useRef<'up' | 'down' | null>(null); // Track wheel scroll direction
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset trigger flags when page changes
    if (lastPageRef.current !== currentPage) {
      hasTriggeredNextRef.current = false;
      hasTriggeredPrevRef.current = false;
      lastPageRef.current = currentPage;
      previousScrollTopRef.current = 0; // Reset scroll position tracking
      lastWheelDirectionRef.current = null; // Reset wheel direction tracking
    }
  }, [currentPage]);

  useEffect(() => {
    // Don't do anything if:
    // - Feature is disabled
    // - Content ref is not available
    // - Page is currently loading
    if (!enabled || !contentRef.current || isPageLoading) {
      return;
    }

    const scrollContainer = contentRef.current;
    // Use the scrollContainer directly since scrolling is now handled by .reader-main
    // .epub-content is no longer scrollable (overflow: visible), so we must use .reader-main
    const scrollableContent = scrollContainer;

    const checkAndLoadNext = () => {
      const scrollTop = scrollableContent.scrollTop;
      const scrollHeight = scrollableContent.scrollHeight;
      const clientHeight = scrollableContent.clientHeight;

      // Debug logging for mobile (helps diagnose issues)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isTouchDevice && enabled) {
        console.log('[useAutoScrollToNextPage] Scroll check:', {
          scrollTop,
          scrollHeight,
          clientHeight,
          distanceFromBottom: scrollHeight - (scrollTop + clientHeight),
          distanceFromTop: scrollTop,
          currentPage,
          totalPages,
        });
      }

      // Calculate distances
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      const distanceFromTop = scrollTop;

      // Calculate scroll percentage
      const scrollableHeight = scrollHeight - clientHeight;
      const scrollPercentage = scrollableHeight > 0 
        ? (scrollTop / scrollableHeight) * 100 
        : 0;

      const contentRequiresScrolling = scrollHeight > clientHeight;

      // Notify parent component about scroll state for visual indicators
      // This should always update, even if navigation is blocked
      if (onScrollStateChange) {
        const nearTop = distanceFromTop <= threshold * 3; // Show indicator within 60px of top
        const nearBottom = distanceFromBottom <= threshold * 3; // Show indicator within 60px of bottom
        const canGoPrev = currentPage > 0 && contentRequiresScrolling;
        const canGoNext = currentPage < totalPages - 1 && contentRequiresScrolling;
        
        onScrollStateChange({
          nearTop,
          nearBottom,
          canGoPrev,
          canGoNext,
        });
      }

      // Skip navigation if page is loading
      if (isPageLoading) {
        return;
      }

      // Check cooldown period (500ms)
      const now = Date.now();
      const timeSinceLastTrigger = now - lastTriggerTimeRef.current;
      if (timeSinceLastTrigger < 500) {
        return; // Still in cooldown period
      }

      // Track scroll direction
      const isScrollingDown = scrollTop > previousScrollTopRef.current;
      const isScrollingUp = scrollTop < previousScrollTopRef.current;
      const isAtTop = distanceFromTop <= threshold; // At or very near top
      previousScrollTopRef.current = scrollTop;

      // Check for next page (scrolling down near bottom)
      if (
        isScrollingDown &&
        currentPage < totalPages - 1 &&
        !hasTriggeredNextRef.current &&
        contentRequiresScrolling &&
        distanceFromBottom <= threshold &&
        scrollPercentage >= 95
      ) {
        console.log('[useAutoScrollToNextPage] Scrolled to bottom, loading next page...', {
          currentPage,
          totalPages,
          distanceFromBottom,
          scrollPercentage: scrollPercentage.toFixed(1),
        });
        
        hasTriggeredNextRef.current = true;
        hasTriggeredPrevRef.current = false; // Reset prev trigger when going forward
        lastTriggerTimeRef.current = now;
        nextPage();
        return;
      }

      // Check for previous page (scrolling up near top)
      // Use wheel direction if available, otherwise fall back to scroll direction
      // This handles cases where scrollTop is already 0 and user tries to scroll up
      const tryingToScrollUp = lastWheelDirectionRef.current === 'up' || isScrollingUp;
      
      if (
        currentPage > 0 &&
        !hasTriggeredPrevRef.current &&
        contentRequiresScrolling &&
        isAtTop &&
        scrollPercentage <= 5 &&
        tryingToScrollUp
      ) {
        console.log('[useAutoScrollToNextPage] Scrolled to top, loading previous page...', {
          currentPage,
          totalPages,
          distanceFromTop,
          scrollTop,
          scrollPercentage: scrollPercentage.toFixed(1),
          isScrollingUp,
          wheelDirection: lastWheelDirectionRef.current,
          isAtTop,
        });
        
        hasTriggeredPrevRef.current = true;
        hasTriggeredNextRef.current = false; // Reset next trigger when going back
        lastTriggerTimeRef.current = now;
        lastWheelDirectionRef.current = null; // Clear wheel direction after triggering
        prevPage();
        return;
      }
    };

    // Detect if mobile/touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handleScroll = throttle(checkAndLoadNext, isTouchDevice ? 300 : 150); // Longer throttle for mobile due to momentum scrolling
    const handleResize = throttle(checkAndLoadNext, 200); // Throttle resize events
    
    // Handle wheel events (desktop only) to detect scroll direction even when scroll position doesn't change
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        // Scrolling up
        lastWheelDirectionRef.current = 'up';
      } else if (e.deltaY > 0) {
        // Scrolling down
        lastWheelDirectionRef.current = 'down';
      }
      
      // Clear wheel direction after a short delay
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = setTimeout(() => {
        lastWheelDirectionRef.current = null;
      }, 300);
      
      // Also trigger checkAndLoadNext for immediate response
      checkAndLoadNext();
    };

    // Handle touch events for mobile to detect scroll direction
    let touchStartY = 0;
    let touchStartScrollTop = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
        touchStartScrollTop = scrollableContent.scrollTop;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY;
        
        // Only update direction if there's significant movement (more than 10px)
        if (Math.abs(deltaY) > 10) {
          if (deltaY < 0) {
            // Touch moving up = content scrolling down = going to next page
            lastWheelDirectionRef.current = 'down';
          } else if (deltaY > 0) {
            // Touch moving down = content scrolling up = going to previous page
            lastWheelDirectionRef.current = 'up';
          }
          
          // Clear direction after delay
          if (wheelTimeoutRef.current) {
            clearTimeout(wheelTimeoutRef.current);
          }
          wheelTimeoutRef.current = setTimeout(() => {
            lastWheelDirectionRef.current = null;
          }, 300);
        }
      }
    };

    const handleTouchEnd = () => {
      // Trigger check after touch ends to catch final scroll position
      setTimeout(() => {
        checkAndLoadNext();
      }, 100);
    };

    // Add debug logging for mobile
    if (isTouchDevice && enabled) {
      console.log('[useAutoScrollToNextPage] Mobile mode enabled, setting up touch events');
    }

    scrollableContent.addEventListener('scroll', handleScroll, { passive: true });
    scrollableContent.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('resize', handleResize);

    // Add touch event listeners for mobile
    if (isTouchDevice) {
      scrollableContent.addEventListener('touchstart', handleTouchStart, { passive: true });
      scrollableContent.addEventListener('touchmove', handleTouchMove, { passive: true });
      scrollableContent.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      // Also add scrollend event if available (newer browsers)
      if ('onscrollend' in scrollableContent) {
        scrollableContent.addEventListener('scrollend', checkAndLoadNext, { passive: true });
      }
    }
    
    // Check initial scroll state on mount
    const checkInitialState = () => {
      if (!isPageLoading) {
        checkAndLoadNext();
        // Debug logging
        if (isTouchDevice && enabled) {
          console.log('[useAutoScrollToNextPage] Initial state check:', {
            scrollTop: scrollableContent.scrollTop,
            scrollHeight: scrollableContent.scrollHeight,
            clientHeight: scrollableContent.clientHeight,
            isTouchDevice,
            enabled,
          });
        }
      }
    };
    
    // Delay to allow content to render
    const timeoutId = setTimeout(checkInitialState, 100);

    return () => {
      scrollableContent.removeEventListener('scroll', handleScroll);
      scrollableContent.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      if (isTouchDevice) {
        scrollableContent.removeEventListener('touchstart', handleTouchStart);
        scrollableContent.removeEventListener('touchmove', handleTouchMove);
        scrollableContent.removeEventListener('touchend', handleTouchEnd);
        if ('onscrollend' in scrollableContent) {
          scrollableContent.removeEventListener('scrollend', checkAndLoadNext);
        }
      }
      clearTimeout(timeoutId);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [enabled, contentRef, currentPage, totalPages, nextPage, prevPage, isPageLoading, threshold, onScrollStateChange]);
}

