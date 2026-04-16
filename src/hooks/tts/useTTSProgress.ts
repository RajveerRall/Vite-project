/**
 * useTTSProgress Hook
 * 
 * Manages TTS playback progress persistence.
 * Wraps TTSProgressRepository with React hooks for save/load/clear operations.
 */

import { useCallback, useRef, useState } from 'react';
import { createTTSProgressRepository } from '../../repositories/TTSProgressRepository';

export interface UseTTSProgressOptions {
    /** Unique identifier for the book */
    bookTitle: string;
    /** Current page display number (1-indexed for UI) */
    currentPageDisplay: number;
    /** Length of current page text (for validation) */
    pageTextLength: number;
    /** Optional instance ID for debugging */
    instanceId?: string;
}

export interface UseTTSProgressReturn {
    /** Current resume index (null if none saved) */
    resumeIndex: number | null;
    /** Whether playback has finished for this page */
    hasFinishedPlayback: boolean;
    /** Save the current playback position */
    saveProgress: (chunkIndex: number) => Promise<void>;
    /** Load saved playback position */
    loadProgress: () => Promise<number | null>;
    /** Clear saved progress and mark as finished */
    clearProgress: () => Promise<void>;
    /** Set resume index manually (for external control) */
    setResumeIndex: (index: number | null) => void;
    /** Mark playback as finished */
    markFinished: () => void;
    /** Reset finished state (for new playback) */
    resetFinished: () => void;
}

/**
 * Hook for managing TTS progress persistence
 * 
 * @example
 * const { resumeIndex, saveProgress, loadProgress, clearProgress } = useTTSProgress({
 *   bookTitle: 'My Book',
 *   currentPageDisplay: 1,
 *   pageTextLength: text.length,
 * });
 */
export function useTTSProgress({
    bookTitle,
    currentPageDisplay,
    pageTextLength,
    instanceId,
}: UseTTSProgressOptions): UseTTSProgressReturn {

    // Create repository instance (stable across renders)
    const readerInstanceId = instanceId || `ReaderInstance_${Date.now()}`;
    const progressRepository = useRef(createTTSProgressRepository(readerInstanceId)).current;

    // State
    const [resumeIndex, setResumeIndex] = useState<number | null>(null);
    const [hasFinishedPlayback, setHasFinishedPlayback] = useState(false);

    // Save progress to storage
    const saveProgress = useCallback(async (chunkIndex: number): Promise<void> => {
        try {
            await progressRepository.saveResumeIndex(bookTitle, currentPageDisplay, chunkIndex);
        } catch (error) {
            console.error(`[${readerInstanceId}][TTS Progress] Error saving:`, error);
        }
    }, [bookTitle, currentPageDisplay, progressRepository, readerInstanceId]);

    // Load progress from storage
    const loadProgress = useCallback(async (): Promise<number | null> => {
        try {
            const index = await progressRepository.loadResumeIndex(
                bookTitle,
                currentPageDisplay,
                pageTextLength
            );
            if (index !== null) {
                setResumeIndex(index);
            }
            return index;
        } catch (error) {
            console.error(`[${readerInstanceId}][TTS Progress] Error loading:`, error);
            return null;
        }
    }, [bookTitle, currentPageDisplay, pageTextLength, progressRepository, readerInstanceId]);

    // Clear progress from storage
    const clearProgress = useCallback(async (): Promise<void> => {
        try {
            await progressRepository.clearResumeIndex(bookTitle, currentPageDisplay);
        } catch (error) {
            console.error(`[${readerInstanceId}][TTS Progress] Error clearing:`, error);
        }
        setResumeIndex(null);
        setHasFinishedPlayback(true);
    }, [bookTitle, currentPageDisplay, progressRepository, readerInstanceId]);

    // Mark playback as finished
    const markFinished = useCallback(() => {
        setHasFinishedPlayback(true);
    }, []);

    // Reset finished state
    const resetFinished = useCallback(() => {
        setHasFinishedPlayback(false);
    }, []);

    return {
        resumeIndex,
        hasFinishedPlayback,
        saveProgress,
        loadProgress,
        clearProgress,
        setResumeIndex,
        markFinished,
        resetFinished,
    };
}

export default useTTSProgress;
