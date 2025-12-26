/**
 * Smooth progress animation hook for progress bars
 * Uses requestAnimationFrame for smooth, performant animations
 */

import { useState, useEffect, useRef } from 'react';

interface UseSmoothProgressOptions {
  currentValue: number;
  targetValue: number;
  duration?: number;
  enabled?: boolean;
}

/**
 * Smooth progress animation hook
 * Animates progress values smoothly instead of jumping instantly
 * 
 * @param options - Configuration options
 * @param options.currentValue - Current progress value (0-100)
 * @param options.targetValue - Target progress value (0-100)
 * @param options.duration - Animation duration in milliseconds (default: 300)
 * @param options.enabled - Whether to enable smooth animation (default: true)
 * @returns Smoothly animated progress value
 */
export function useSmoothProgress({
  currentValue,
  targetValue,
  duration = 300,
  enabled = true,
}: UseSmoothProgressOptions): number {
  const [smoothValue, setSmoothValue] = useState(currentValue);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(currentValue);

  useEffect(() => {
    // If disabled or values are the same, update immediately
    if (!enabled || currentValue === targetValue) {
      setSmoothValue(targetValue);
      return;
    }

    // Reset animation state
    startValueRef.current = smoothValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      // Creates smooth deceleration at the end
      const eased = 1 - Math.pow(1 - progress, 3);
      const newValue = startValueRef.current + (targetValue - startValueRef.current) * eased;

      setSmoothValue(newValue);

      // Continue animation if not complete
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete, set final value
        setSmoothValue(targetValue);
      }
    };

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount or when values change
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [currentValue, targetValue, duration, enabled, smoothValue]);

  return smoothValue;
}








