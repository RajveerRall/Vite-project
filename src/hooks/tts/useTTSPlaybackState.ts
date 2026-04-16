/**
 * useTTSPlaybackState Hook
 * 
 * Manages the core playback state machine for TTS.
 * This is a simplified, focused hook that handles state transitions
 * without audio implementation details.
 * 
 * States:
 * - IDLE: Not playing, not paused
 * - PLAYING: Currently playing audio
 * - PAUSED: Playback is paused
 * - PROCESSING: Loading/preparing audio
 */

import { useState, useCallback, useRef } from 'react';

/** Playback states */
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'processing';

export interface UseTTSPlaybackStateOptions {
    /** Optional instance ID for debugging */
    instanceId?: string;
    /** Callback when playback starts */
    onPlay?: () => void;
    /** Callback when playback pauses */
    onPause?: () => void;
    /** Callback when playback stops */
    onStop?: () => void;
}

export interface UseTTSPlaybackStateReturn {
    /** Current playback state */
    state: PlaybackState;
    /** Whether currently playing */
    isPlaying: boolean;
    /** Whether currently paused */
    isPaused: boolean;
    /** Whether processing (loading) */
    isProcessing: boolean;
    /** Whether idle (not playing or paused) */
    isIdle: boolean;
    /** Current chunk index being played */
    currentChunkIndex: number | null;
    /** Index to resume from when paused */
    resumeIndex: number | null;
    /** Whether TTS intent is active (user wants audio) */
    isTTSIntentActive: boolean;

    // State transitions
    /** Start playing a chunk */
    startPlaying: (chunkIndex: number) => void;
    /** Pause current playback */
    pause: () => void;
    /** Resume from paused state */
    resume: () => void;
    /** Stop playback completely */
    stop: () => void;
    /** Set processing state (loading audio) */
    setProcessing: (processing: boolean) => void;
    /** Update current chunk index */
    setCurrentChunk: (index: number | null) => void;
    /** Set TTS intent active flag */
    setTTSIntentActive: (active: boolean) => void;
    /** Set resume index manually */
    setResumeIndex: (index: number | null) => void;
}

/**
 * Hook for managing TTS playback state machine
 * 
 * @example
 * const { 
 *   state, 
 *   isPlaying, 
 *   startPlaying, 
 *   pause, 
 *   resume, 
 *   stop 
 * } = useTTSPlaybackState({
 *   onPlay: () => console.log('Started'),
 *   onStop: () => console.log('Stopped'),
 * });
 */
export function useTTSPlaybackState({
    instanceId,
    onPlay,
    onPause,
    onStop,
}: UseTTSPlaybackStateOptions = {}): UseTTSPlaybackStateReturn {
    // instanceId can be used for future logging/debugging
    void instanceId;

    // Core state
    const [state, setState] = useState<PlaybackState>('idle');
    const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null);
    const [resumeIndex, setResumeIndex] = useState<number | null>(null);

    // Refs for synchronous access
    const ttsIntentActiveRef = useRef(false);

    // Derived states
    const isPlaying = state === 'playing';
    const isPaused = state === 'paused';
    const isProcessing = state === 'processing';
    const isIdle = state === 'idle';
    const isTTSIntentActive = ttsIntentActiveRef.current;

    // State transitions
    const startPlaying = useCallback((chunkIndex: number) => {
        setState('playing');
        setCurrentChunkIndex(chunkIndex);
        ttsIntentActiveRef.current = true;
        onPlay?.();
    }, [onPlay]);

    const pause = useCallback(() => {
        if (state === 'playing') {
            setState('paused');
            if (currentChunkIndex !== null) {
                setResumeIndex(currentChunkIndex);
            }
            onPause?.();
        }
    }, [state, currentChunkIndex, onPause]);

    const resume = useCallback(() => {
        if (state === 'paused' && resumeIndex !== null) {
            setState('playing');
            setCurrentChunkIndex(resumeIndex);
            ttsIntentActiveRef.current = true;
        }
    }, [state, resumeIndex]);

    const stop = useCallback(() => {
        setState('idle');
        setCurrentChunkIndex(null);
        ttsIntentActiveRef.current = false;
        onStop?.();
    }, [onStop]);

    const setProcessing = useCallback((processing: boolean) => {
        if (processing) {
            setState('processing');
        } else if (state === 'processing') {
            // Only change from processing if we're currently processing
            setState('idle');
        }
    }, [state]);

    const setCurrentChunk = useCallback((index: number | null) => {
        setCurrentChunkIndex(index);
    }, []);

    const setTTSIntentActive = useCallback((active: boolean) => {
        ttsIntentActiveRef.current = active;
    }, []);

    return {
        state,
        isPlaying,
        isPaused,
        isProcessing,
        isIdle,
        currentChunkIndex,
        resumeIndex,
        isTTSIntentActive,
        startPlaying,
        pause,
        resume,
        stop,
        setProcessing,
        setCurrentChunk,
        setTTSIntentActive,
        setResumeIndex,
    };
}

export default useTTSPlaybackState;
