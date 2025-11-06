import { useState, useEffect, RefObject } from 'react';
import { throttle } from '../utils/throttle';

export const useReadingProgress = (contentRef: RefObject<HTMLElement>, currentPage: number) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // Reset progress when page changes
    setProgress(0);
  }, [currentPage]);
  
  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    
    // Use the element directly since scrolling is now handled by .reader-main
    // .epub-content is no longer scrollable (overflow: visible)
    const scrollableElement = element; // element is already .reader-main
    
    const handleScroll = throttle(() => {
      const scrollTop = scrollableElement.scrollTop;
      const scrollHeight = scrollableElement.scrollHeight;
      const clientHeight = scrollableElement.clientHeight;
      
      // Calculate percentage
      const scrollableHeight = scrollHeight - clientHeight;
      
      // Debug logging
      console.log('Scroll Debug:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        scrollableHeight,
        element: scrollableElement.className,
        isReaderMain: scrollableElement === element
      });
      
      let percentage = 0;
      if (scrollableHeight <= 0) {
        // Content doesn't overflow, so we're at 100%
        percentage = 100;
      } else {
        percentage = Math.round((scrollTop / scrollableHeight) * 100);
        // Clamp between 0 and 100
        percentage = Math.max(0, Math.min(100, percentage));
      }
      
      console.log('Calculated percentage:', percentage);
      setProgress(percentage);
    }, 100);
    
    scrollableElement.addEventListener('scroll', handleScroll);
    // Also calculate on mount
    handleScroll();
    
    return () => scrollableElement.removeEventListener('scroll', handleScroll);
  }, [contentRef, currentPage]);
  
  return progress;
};
