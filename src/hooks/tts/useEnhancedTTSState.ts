/**
 * Enhanced TTS state hook with debouncing and smooth transitions
 * Wrapper around useTTSStateMachine for better state management
 * 
 * Note: This is prepared for future use but not integrated yet to maintain stability
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTTSStateMachine } from './useTTSStateMachine';
import { TTSState } from '../../types/tts';

interface UseEnhancedTTSStateOptions {
  debounceMs?: number;
  onStateChange?: (state: TTSState) => void;
}

/**
 * Enhanced TTS state hook with debouncing and smooth transitions
 * 
 * @param options - Configuration options
 * @param options.debounceMs - Debounce delay in milliseconds (default: 150)
 * @param options.onStateChange - Callback when state changes
 * @returns Enhanced state machine with debounced transitions
 */
export function useEnhancedTTSState(options: UseEnhancedTTSStateOptions = {}) {
  const { debounceMs = 150, onStateChange } = options;
  const stateMachine = useTTSStateMachine();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStateRef = useRef<TTSState | null>(null);

  // Debounced state transition
  const transitionToDebounced = useCallback((newState: TTSState, immediate = false) => {
    // Clear any pending transitions
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const executeTransition = () => {
      setIsTransitioning(true);
      stateMachine.transitionTo(newState);
      onStateChange?.(newState);
      
      // Reset transitioning flag after animation
      setTimeout(() => setIsTransitioning(false), 200);
    };

    if (immediate || debounceMs === 0) {
      executeTransition();
    } else {
      pendingStateRef.current = newState;
      debounceTimerRef.current = setTimeout(executeTransition, debounceMs);
    }
  }, [stateMachine, debounceMs, onStateChange]);

  // Cancel pending transitions
  const cancelPendingTransition = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingStateRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ...stateMachine,
    transitionTo: transitionToDebounced,
    transitionToImmediate: (state: TTSState) => transitionToDebounced(state, true),
    cancelPendingTransition,
    isTransitioning,
  };
}








