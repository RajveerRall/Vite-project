/**
 * Throttle hook - limits function calls to once per delay period
 * Useful for preventing excessive updates during rapid events (e.g., drag operations)
 */

import { useCallback, useRef } from 'react';

/**
 * Throttle a function to limit execution frequency
 * @param func - Function to throttle
 * @param delay - Minimum milliseconds between executions
 * @returns Throttled version of the function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        // Enough time has passed, execute immediately
        lastRunRef.current = now;
        func(...args);
      } else {
        // Schedule execution for remaining time
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          func(...args);
        }, delay - timeSinceLastRun);
      }
    }) as T,
    [func, delay]
  );
}

