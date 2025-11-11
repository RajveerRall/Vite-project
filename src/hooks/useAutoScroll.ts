import { useEffect, useRef, useCallback } from 'react';

interface UseAutoScrollProps {
  isActive: boolean;
  highlightedContent: string | null;
  scrollContainer?: HTMLElement | null;
}

export const useAutoScroll = ({ 
  isActive, 
  highlightedContent, 
  scrollContainer 
}: UseAutoScrollProps) => {
  const lastScrollTime = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced scroll function to avoid excessive scrolling
  const debouncedScrollToHighlight = useCallback((delay: number = 100) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const highlightElement = document.querySelector('.tts-highlight');
      if (!highlightElement || !isActive) return;

      const container = scrollContainer || document.documentElement;
      const highlightRect = highlightElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Check if highlight is outside the visible area
      const isAbove = highlightRect.top < containerRect.top + 100; // 100px buffer from top
      const isBelow = highlightRect.bottom > containerRect.bottom - 100; // 100px buffer from bottom

      if (isAbove || isBelow) {
        const now = Date.now();
        // Throttle scrolling to avoid excessive scroll events
        if (now - lastScrollTime.current > 300) {
          highlightElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          lastScrollTime.current = now;
        }
      }
    }, delay);
  }, [isActive, scrollContainer]);

  // Effect to trigger scroll when highlighting changes
  useEffect(() => {
    if (isActive && highlightedContent) {
      // Small delay to ensure DOM is updated with new highlight
      debouncedScrollToHighlight(150);
    }
  }, [highlightedContent, isActive, debouncedScrollToHighlight]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    scrollToHighlight: debouncedScrollToHighlight
  };
}; 