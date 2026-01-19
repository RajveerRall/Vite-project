import { useCallback } from 'react';
import { useAnonymousUsageLimit } from '../useAnonymousUsageLimit';
import { fetchUsageLimit } from '../../services/subscription/SubscriptionService';

export interface UseTTSNavigationProps {
    // Data
    chunks: string[];
    currentChunkIndex: number | null;

    // State Refs
    readerInstanceId: string;
    isSpeaking: boolean;
    isPaused: boolean;
    ttsIntentActiveRef: React.MutableRefObject<boolean>;
    isChunkPlayingRef: React.MutableRefObject<number | null>;
    isAutoAdvancingRef: React.MutableRefObject<boolean>;


    // State Setters
    setIsSpeaking: (speaking: boolean) => void;
    setIsPaused: (paused: boolean) => void;
    setIsProcessing: (processing: boolean) => void;
    setHasFinishedPlayback: (finished: boolean) => void;
    setResumeIndex: (index: number | null) => void;

    // Actions
    haltPlayback: () => void;
    pausePlayback: () => void;
    playChunk: (index: number) => Promise<void>;
    saveResumeIndex: (index: number) => Promise<void>;

    // Buffering
    fetchSingleChunk: (index: number) => Promise<void>;
    prefetchChunks: (startIndex: number) => Promise<void>;

    // Context/External
    addToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    user: any; // Type as needed
    refreshUsageLimit: () => Promise<void>;
    anonymousLimit?: ReturnType<typeof useAnonymousUsageLimit>;

    // Constants
    INITIAL_PREFETCH_COUNT?: number;
}

export const useTTSNavigation = ({
    chunks,
    currentChunkIndex,
    readerInstanceId,
    isSpeaking,
    isPaused,
    ttsIntentActiveRef,
    isChunkPlayingRef,
    isAutoAdvancingRef,

    setIsSpeaking,
    setIsPaused,
    setIsProcessing,
    setHasFinishedPlayback,
    setResumeIndex,
    haltPlayback,
    pausePlayback,
    playChunk,
    saveResumeIndex,
    fetchSingleChunk,
    prefetchChunks,
    addToast,
    user,
    refreshUsageLimit,
    anonymousLimit,
    INITIAL_PREFETCH_COUNT = 2
}: UseTTSNavigationProps) => {

    const handleTTSNavigation = useCallback(() => {
        if (ttsIntentActiveRef.current && (isSpeaking || isPaused)) {
            // Save current position (chunk index)
            saveResumeIndex(currentChunkIndex ?? 0);
        }
        haltPlayback();
        ttsIntentActiveRef.current = false;
    }, [isSpeaking, isPaused, saveResumeIndex, haltPlayback, ttsIntentActiveRef, currentChunkIndex]);

    // === Previous Sentence Navigation ===
    const handlePreviousSentence = useCallback(() => {
        if (currentChunkIndex !== null && currentChunkIndex > 0) {
            const previousChunkIndex = currentChunkIndex - 1;

            // Prevent playing same chunk if already playing
            if (isChunkPlayingRef.current === previousChunkIndex && isSpeaking) {
                console.log(`[${readerInstanceId}][Previous Sentence] Already playing chunk ${previousChunkIndex}, skipping`);
                return;
            }

            // Stop current playback if playing
            if (isSpeaking) {
                pausePlayback();
            }

            console.log(`[${readerInstanceId}][Previous Sentence] Moving from chunk ${currentChunkIndex} to ${previousChunkIndex}`);

            // Update playing chunk ref before playing
            isChunkPlayingRef.current = previousChunkIndex;

            // Prefetch and play the previous chunk
            prefetchChunks(previousChunkIndex);
            playChunk(previousChunkIndex);
        } else {
            console.log(`[${readerInstanceId}][Previous Sentence] Already at first sentence or no current chunk`);
        }
    }, [currentChunkIndex, isSpeaking, pausePlayback, prefetchChunks, playChunk, readerInstanceId, isChunkPlayingRef]);

    // === Next Sentence Navigation ===
    const handleNextSentence = useCallback(() => {
        // Check if we're currently auto-advancing (from onended handler)
        if (isAutoAdvancingRef.current) {
            console.log(`[${readerInstanceId}][Next Sentence] Skipping pause - auto-advancing in progress`);
            return;
        }

        if (currentChunkIndex !== null && currentChunkIndex < chunks.length - 1) {
            const nextChunkIndex = currentChunkIndex + 1;

            // Prevent playing same chunk if already playing
            if (isChunkPlayingRef.current === nextChunkIndex && isSpeaking) {
                console.log(`[${readerInstanceId}][Next Sentence] Already playing chunk ${nextChunkIndex}, skipping`);
                return;
            }

            // Stop current playback if playing (manual navigation only)
            if (isSpeaking) {
                pausePlayback();
            }

            console.log(`[${readerInstanceId}][Next Sentence] Manual navigation: Moving from chunk ${currentChunkIndex} to ${nextChunkIndex}`);

            // Update playing chunk ref before playing
            isChunkPlayingRef.current = nextChunkIndex;

            // Prefetch and play the next chunk
            prefetchChunks(nextChunkIndex);
            playChunk(nextChunkIndex);
        } else {
            console.log(`[${readerInstanceId}][Next Sentence] Already at last sentence or no current chunk`);
        }
    }, [currentChunkIndex, chunks.length, isSpeaking, pausePlayback, prefetchChunks, playChunk, readerInstanceId, isAutoAdvancingRef, isChunkPlayingRef]);

    // === Preview scroll without starting TTS ===
    const handlePreviewScroll = useCallback((percentage: number) => {
        if (!chunks || chunks.length === 0) return;

        // Convert percentage to chunk index
        const previewChunkIndex = Math.floor((percentage / 100) * chunks.length);
        const safeChunkIndex = Math.max(0, Math.min(previewChunkIndex, chunks.length - 1));

        console.log(`[${readerInstanceId}][handlePreviewScroll] Previewing ${Math.round(percentage)}% (chunk ${safeChunkIndex})`);

        // Try to find element with chunk text
        const chunkText = chunks[safeChunkIndex];
        if (!chunkText) return;

        // Search for element containing this chunk text
        const contentElement = document.querySelector('.epub-content');
        if (!contentElement) return;

        // Get all text nodes and find the one containing our chunk
        const walker = document.createTreeWalker(
            contentElement,
            NodeFilter.SHOW_TEXT,
            null
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.textContent?.includes(chunkText.substring(0, 30))) {
                // Found it! Scroll to parent element
                const element = node.parentElement;
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    return;
                }
            }
        }

        // Fallback: estimate scroll position based on percentage
        if (contentElement) {
            const scrollHeight = contentElement.scrollHeight;
            const targetScroll = (percentage / 100) * scrollHeight;
            contentElement.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }, [chunks, readerInstanceId]);

    // === Seek and start TTS ===
    const handleSeekToPercentage = useCallback(async (percentage: number) => {
        console.log(`[${readerInstanceId}][handleSeekToPercentage] SEEK CALLED - percentage: ${percentage}`);

        if (!chunks || chunks.length === 0) {
            console.warn(`[${readerInstanceId}][handleSeekToPercentage] No chunks available`);
            return;
        }

        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        const targetChunkIndex = Math.floor((clampedPercentage / 100) * chunks.length);
        const safeChunkIndex = Math.max(0, Math.min(targetChunkIndex, chunks.length - 1));

        console.log(`[${readerInstanceId}][handleSeekToPercentage] Seeking to ${Math.round(clampedPercentage)}% (chunk ${safeChunkIndex})`);

        // Stop current playback first
        haltPlayback();

        // Reset all TTS state
        setIsSpeaking(false);
        setIsPaused(false);
        setIsProcessing(true); // Show loading state while prefetching
        setHasFinishedPlayback(false);

        // Don't set currentChunkIndex here - let onPlay callback set it when audio actually starts
        // This ensures highlight is synchronized with audio playback, not with the seek action
        setResumeIndex(null); // Clear resume so it starts fresh

        // Activate TTS intent
        ttsIntentActiveRef.current = true;

        // Usage limit checks for seeking (loophole fix)
        const checkLimits = async () => {
            if (anonymousLimit) {
                const canUseTTS = await anonymousLimit.checkLimit();
                if (!canUseTTS) {
                    console.warn('[TTS] Anonymous limit reached, blocking seeking');
                    addToast?.('Please sign up to continue using Read Aloud', 'info');
                    setIsProcessing(false);
                    return false;
                }
            }

            // Check authenticated user limit
            if (user?.id) {
                try {
                    await refreshUsageLimit();
                    const limitData = await fetchUsageLimit(user.id);
                    if (limitData) {
                        const limitExceeded = (limitData.limit_exceeded ?? false) ||
                            (limitData.minutes_remaining !== null &&
                                limitData.minutes_remaining < 1 &&
                                (limitData.prepaid_minutes ?? 0) === 0);

                        if (limitExceeded) {
                            console.warn('[TTS] Authenticated limit reached, blocking seeking');
                            addToast?.('TTS usage limit reached. Please upgrade your subscription to continue.', 'error');
                            setIsProcessing(false);
                            return false;
                        }
                    }
                } catch (e) {
                    console.error('[TTS] Error checking limit during seek:', e);
                }
            }
            return true;
        };

        const isAllowed = await checkLimits();
        if (!isAllowed) return;

        // Prefetch target chunk (and next one) before playing to avoid delay
        const startPlayback = async () => {
            console.log(`[${readerInstanceId}][handleSeekToPercentage] Prefetching chunk ${safeChunkIndex} before playback`);

            try {
                // OPTIMISTIC PLAYBACK: Start fetching the first chunk
                const firstChunkPromise = fetchSingleChunk(safeChunkIndex);

                // Start next chunk prefetch immediately
                if (safeChunkIndex + 1 < chunks.length) {
                    fetchSingleChunk(safeChunkIndex + 1).catch(err =>
                        console.warn('[handleSeekToPercentage] Background prefetch of second chunk failed:', err)
                    );
                    // Trigger broader prefetch for subsequent chunks
                    prefetchChunks(safeChunkIndex + INITIAL_PREFETCH_COUNT).catch(err =>
                        console.warn('[handleSeekToPercentage] Background prefetch failed:', err)
                    );
                }

                // Wait for first chunk to be ready (necessary for playback)
                await firstChunkPromise;

                setIsProcessing(false);

                // Wrap playChunk in setTimeout(0) to break synchronous execution
                // This ensures the UI updates (setIsProcessing: false) are painted before audio work begins
                setTimeout(() => {
                    playChunk(safeChunkIndex);
                }, 0);

            } catch (error) {
                console.error(`[${readerInstanceId}][handleSeekToPercentage] Error starting playback:`, error);
                setIsProcessing(false);
                setIsSpeaking(false);
                setIsPaused(false);
                ttsIntentActiveRef.current = false;
                addToast?.('Failed to start playback. Please try again.', 'error');
            }
        };
        startPlayback();

        addToast?.(`Starting from ${Math.round(clampedPercentage)}% of chapter`, 'success');
    }, [chunks, readerInstanceId, addToast, haltPlayback, playChunk, fetchSingleChunk, prefetchChunks, anonymousLimit, user, refreshUsageLimit, setIsSpeaking, setIsPaused, setIsProcessing, setHasFinishedPlayback, setResumeIndex, ttsIntentActiveRef, INITIAL_PREFETCH_COUNT]);

    return {
        handleTTSNavigation,
        handlePreviousSentence,
        handleNextSentence,
        handlePreviewScroll,
        handleSeekToPercentage
    };
};
