// src/hooks/reader/useMobileDetection.ts
// Hook for detecting mobile screen size

import { useState, useEffect } from 'react';
import { MOBILE_BREAKPOINT } from '../../constants/readerConstants';

/**
 * Custom hook for detecting if the current viewport is mobile
 * @returns true if screen width is below mobile breakpoint
 */
export function useMobileDetection(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}

