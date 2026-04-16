/**
 * State machine hook for managing TTS playback states
 * Replaces scattered boolean state variables with a predictable state machine
 */

import { useState, useCallback, useRef } from 'react';
import { TTSState, PlaybackStatus } from '../../types/tts';

export interface TTSStateMachineReturn {
  state: TTSState;
  playbackStatus: PlaybackStatus;
  transitionTo: (newState: TTSState) => void;
  isIdle: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isStopped: boolean;
  isError: boolean;
}

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<TTSState, TTSState[]> = {
  [TTSState.IDLE]: [TTSState.PROCESSING, TTSState.PLAYING, TTSState.ERROR],
  [TTSState.PROCESSING]: [TTSState.PLAYING, TTSState.IDLE, TTSState.ERROR],
  [TTSState.PLAYING]: [TTSState.PAUSED, TTSState.STOPPED, TTSState.IDLE, TTSState.ERROR],
  [TTSState.PAUSED]: [TTSState.PLAYING, TTSState.STOPPED, TTSState.IDLE, TTSState.ERROR],
  [TTSState.STOPPED]: [TTSState.IDLE, TTSState.PROCESSING, TTSState.ERROR],
  [TTSState.ERROR]: [TTSState.IDLE, TTSState.PROCESSING],
};

export function useTTSStateMachine(
  totalChunks: number = 0
): TTSStateMachineReturn {
  const [state, setState] = useState<TTSState>(TTSState.IDLE);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null);
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [hasFinished, setHasFinished] = useState<boolean>(false);
  const isAutoAdvancingRef = useRef<boolean>(false);

  /**
   * Transition to a new state (with validation)
   */
  const transitionTo = useCallback((newState: TTSState) => {
    setState((currentState) => {
      const validTransitions = VALID_TRANSITIONS[currentState];
      
      if (!validTransitions.includes(newState)) {
        console.warn(
          `[TTS State Machine] Invalid transition from ${currentState} to ${newState}. Allowed: ${validTransitions.join(', ')}`
        );
        return currentState;
      }

      console.log(`[TTS State Machine] Transition: ${currentState} -> ${newState}`);
      return newState;
    });
  }, []);

  /**
   * Update current chunk index
   */
  const updateChunkIndex = useCallback((index: number | null) => {
    setCurrentChunkIndex(index);
    if (index === null) {
      setHasFinished(true);
    } else {
      setHasFinished(false);
    }
  }, []);

  /**
   * Update resume index
   */
  const updateResumeIndex = useCallback((index: number | null) => {
    setResumeIndex(index);
  }, []);

  /**
   * Set auto-advancing flag
   */
  const setAutoAdvancing = useCallback((value: boolean) => {
    isAutoAdvancingRef.current = value;
  }, []);

  /**
   * Get auto-advancing flag
   */
  const getAutoAdvancing = useCallback(() => {
    return isAutoAdvancingRef.current;
  }, []);

  // Computed state flags
  const isIdle = state === TTSState.IDLE;
  const isProcessing = state === TTSState.PROCESSING;
  const isPlaying = state === TTSState.PLAYING;
  const isPaused = state === TTSState.PAUSED;
  const isStopped = state === TTSState.STOPPED;
  const isError = state === TTSState.ERROR;

  // Playback status
  const playbackStatus: PlaybackStatus = {
    state,
    currentChunkIndex,
    totalChunks,
    isAutoAdvancing: isAutoAdvancingRef.current,
    resumeIndex,
    hasFinished,
  };

  return {
    state,
    playbackStatus,
    transitionTo,
    isIdle,
    isProcessing,
    isPlaying,
    isPaused,
    isStopped,
    isError,
    // Internal methods exposed for advanced control
    updateChunkIndex,
    updateResumeIndex,
    setAutoAdvancing,
    getAutoAdvancing,
  } as TTSStateMachineReturn & {
    updateChunkIndex: (index: number | null) => void;
    updateResumeIndex: (index: number | null) => void;
    setAutoAdvancing: (value: boolean) => void;
    getAutoAdvancing: () => boolean;
  };
}

