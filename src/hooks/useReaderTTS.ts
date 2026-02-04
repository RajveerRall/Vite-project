import { useState, useCallback, useRef, useEffect } from 'react';
import { useAnonymousUsageLimit } from './useAnonymousUsageLimit';
import { useTTS } from '../context/TTSContext';
import { useToast } from '../context/ToastContext';
import { useTTSChunking } from './tts/useTTSChunking';
import { useTTSHighlighting } from './tts/useTTSHighlighting';

export interface UseReaderTTSReturn {
    // TTS States
    chunks: string[];
    currentChunkIndex: number | null;
    isSpeaking: boolean;
    isProcessing: boolean;
    isPaused: boolean;
    isBuffering: boolean; // Add this
    resumeIndex: number | null;
    hasFinishedPlayback: boolean;
    useKokoroTTS: boolean;
    highlightedContent: string;
    activeChunk: string | null;
    bufferedChunksCount: number;

    // TTS Controls
    handleTTS: (selectedText?: string) => void;
    handleStopTTS: () => void;
    pausePlayback: () => void;
    resumePlayback: () => void;

    // Navigation handlers (TTS-aware)
    handleTTSNavigation: () => void;
    handlePreviousSentence: () => void;
    handleNextSentence: () => void;

    // Interactive Progress Bar handlers
    handlePreviewScroll: (percentage: number) => void;
    handleSeekToPercentage: (percentage: number) => void;

    // Audio control
    setPlaybackRate: (rate: number) => void;

    // Computed values
    canTTSResume: boolean;

    // Anonymous usage limit
    anonymousLimit: ReturnType<typeof useAnonymousUsageLimit>;
}

interface UseReaderTTSProps {
    bookTitle: string;
    bookAuthor?: string;
    bookId?: string;
    currentChapterHref?: string;
    chapterTitle?: string;
    currentPageDisplay: number;
    currentPageText: string;
    currentContent: string;
    selectedVoice?: string;
    ttsSpeed?: number;
    onPlaybackComplete?: () => void;
    isPageLoading?: boolean;
}

export const useReaderTTS = ({
    bookTitle,
    bookAuthor = 'Unknown Author',
    bookId,
    currentChapterHref,
    chapterTitle = 'Reading...',
    currentPageText,
    currentContent,
    // selectedVoice = 'en-US-BrianMultilingualNeural', // Unused in this shim
    ttsSpeed = 1,
    onPlaybackComplete,
    // isPageLoading = false // Unused in this shim
}: UseReaderTTSProps): UseReaderTTSReturn => {
    const anonymousLimit = useAnonymousUsageLimit();

    // effectiveBookId: Prefer bookId, fallback to bookTitle
    const effectiveBookId = bookId || bookTitle;

    // === Global Context ===
    const {
        isPlaying: globalIsPlaying,
        isPaused: globalIsPaused,
        isLoading: globalIsLoading,
        isBuffering: globalIsBuffering, // Get this
        currentBookId: globalBookId,
        currentChapterId: globalChapterId,
        currentChunkIndex: globalChunkIndex,
        play: globalPlay,
        pause: globalPause,
        stop: globalStop,
        loadBook,
        setPlaybackRate: globalSetRate,
        seekToChunk: globalSeek,
        checkAudioAvailability,
        prioritizeChunk
    } = useTTS();

    const { addToast } = useToast();

    // === Local Processing ===
    const chunkingHook = useTTSChunking({ text: currentPageText });
    const chunks = chunkingHook.chunks;

    // === Derived State ===
    const isGlobalActive = globalBookId === effectiveBookId;
    // CRITICAL FIX: Only consider global state active for THIS chapter
    const isChapterActive = isGlobalActive && (globalChapterId === currentChapterHref);

    const isSpeaking = isChapterActive && globalIsPlaying;
    const isPaused = isChapterActive && globalIsPaused;
    const isProcessing = isChapterActive && globalIsLoading;
    const isBuffering = isChapterActive && globalIsBuffering;
    const currentChunkIndex = isChapterActive ? globalChunkIndex : null;

    const [useKokoroTTS] = useState(false);

    // === Highlighting ===
    const { highlightedContent, activeChunk, highlightChunk, clearHighlight } = useTTSHighlighting(currentContent, { escapeHtml: false });

    // Update highlighting when chunk index changes
    useEffect(() => {
        if (isGlobalActive && currentChunkIndex !== null && chunks[currentChunkIndex]) {
            highlightChunk(currentContent, chunks[currentChunkIndex], currentChunkIndex);
        } else if (!isSpeaking && !isPaused) {
            clearHighlight();
        }
    }, [isGlobalActive, isSpeaking, isPaused, currentChunkIndex, chunks, currentContent, highlightChunk, clearHighlight]);

    // === Playback Completion Detection ===
    const wasPlayingRef = useRef(false);
    useEffect(() => {
        if (isSpeaking) {
            wasPlayingRef.current = true;
        } else if (wasPlayingRef.current && !isPaused && !isSpeaking) {
            // Stopped. Check if we finished the chapter?
            if (chunks.length > 0 && currentChunkIndex !== null && currentChunkIndex >= chunks.length - 1) {
                console.log('[useReaderTTS] Playback finished for chapter, triggering completion');
                onPlaybackComplete?.();
                wasPlayingRef.current = false;
            }
        }
    }, [isSpeaking, isPaused, currentChunkIndex, chunks.length, onPlaybackComplete]);

    // Sync Global Playback Rate if prop changes
    useEffect(() => {
        if (isGlobalActive && ttsSpeed) {
            globalSetRate(ttsSpeed);
        }
    }, [isGlobalActive, ttsSpeed, globalSetRate]);

    // === Controls ===

    const handleTTS = useCallback(async (textOverride?: string) => {
        console.log(`[useReaderTTS] handleTTS invoked. textOverride length: ${textOverride?.length}`);

        // 1. Capture the selection intent
        const windowSelection = window.getSelection()?.toString().trim();
        const rawSelection = (typeof textOverride === 'string' ? textOverride : null) || windowSelection;

        // Helper: Robust normalization that preserves alphanumeric chars but handles wide variety of whitespace/punctuation
        // Removes all non-alphanumeric characters except spaces, then collapses whitespace
        const normalize = (t: string) => t.toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, '') // Keep Unicode letters, numbers, and spaces
            .replace(/\s+/g, ' ')
            .trim();

        let targetIndex: number | null = null;

        if (rawSelection && chunks.length > 0) {
            const normSelection = normalize(rawSelection);

            // Short-circuit for empty selection after normalization
            if (normSelection.length < 2) {
                console.log('[useReaderTTS] Selection too short after normalization, ignoring matching');
            } else {
                console.log(`[useReaderTTS] Matching selection: "${normSelection.substring(0, 30)}..."`);

                // STRATEGY: Full Text Offset Mapping
                // 1. Reconstruct full text from chunks to ensure alignment with our chunking (or use currentPageText if provided)
                // We use chunks.join(' ') as a proxy for the readable text flow
                const normFullText = chunks.map(c => normalize(c)).join(' ');

                // 2. Find where the selection starts in the full normalized text
                const matchIndex = normFullText.indexOf(normSelection);

                if (matchIndex !== -1) {
                    console.log(`[useReaderTTS] Found match in full text at index ${matchIndex}`);

                    // 3. Walk through chunks to find which one contains this index
                    let runningLength = 0;
                    for (let i = 0; i < chunks.length; i++) {
                        const chunkLen = normalize(chunks[i]).length + 1; // +1 for the join space

                        // If the match starts within this chunk (or effectively at the start of it)
                        // Or if we are accumulating past the match index
                        if (runningLength + chunkLen > matchIndex) {
                            targetIndex = i;
                            console.log(`[useReaderTTS] Mapped offset ${matchIndex} to Chunk #${targetIndex}`);
                            break;
                        }
                        runningLength += chunkLen;
                    }
                } else {
                    // Fallback: Try the "includes" check for single-sentence selections (legacy)
                    targetIndex = chunks.findIndex((chunk, i) => {
                        const normChunk = normalize(chunk);
                        return normChunk.includes(normSelection) || normSelection.includes(normChunk);
                    });

                    if (targetIndex !== -1) {
                        console.log(`[useReaderTTS] Fuzzy fallback match found at Chunk #${targetIndex}`);
                    } else {
                        console.warn(`[useReaderTTS] No match found for selection via Offset or Fuzzy.`);
                    }
                }
            }
        }

        const targetHref = currentChapterHref || '';

        // 2. Playback logic branches
        // If we found a specific target (selection), we ALWAYS jump there
        // If we found a specific target (selection), we ALWAYS jump there
        if (targetIndex !== null) {
            if (!effectiveBookId) {
                console.error('[useReaderTTS] No effectiveBookId for playback');
                return;
            }

            // Smart Scrubbing Check
            const isAvailable = await checkAudioAvailability(targetIndex);
            if (!isAvailable) {
                console.log(`[SmartScrub] Target chunk ${targetIndex} missing. Prioritizing.`);
                prioritizeChunk(targetIndex);
                addToast('Please wait while this part of the chapter is being generated...', 'info');
                // Proceed to seek anyway - Player will buffer
            }

            console.log(`[useReaderTTS] JUMP to #${targetIndex} in "${targetHref}"`);

            // If already playing this book/chapter, we can just seek? 
            // Ideally loadBook handles the "same context" optimization internally or we rely on GlobalPlayer
            await loadBook(effectiveBookId, bookTitle, bookAuthor, chapterTitle, targetHref, targetIndex);
            globalPlay();
            return;
        }

        // Standard Toggle behavior (if no selection matched)
        if (isSpeaking) {
            console.log("[useReaderTTS] TOGGLE: Pause");
            globalPause();
        } else if (isPaused) {
            console.log("[useReaderTTS] TOGGLE: Resume");
            globalPlay();
        } else {
            if (!effectiveBookId) return;
            console.log(`[useReaderTTS] START: Beginning of "${targetHref}"`);
            await loadBook(effectiveBookId, bookTitle, bookAuthor, chapterTitle, targetHref, 0);
            globalPlay();
        }
    }, [isSpeaking, isPaused, effectiveBookId, bookTitle, bookAuthor, chapterTitle, currentChapterHref, globalPause, globalPlay, loadBook, chunks]);

    const handleStopTTS = useCallback(() => {
        if (isGlobalActive) globalStop();
    }, [isGlobalActive, globalStop]);

    const pausePlayback = useCallback(() => {
        if (isGlobalActive) globalPause();
    }, [isGlobalActive, globalPause]);

    const resumePlayback = useCallback(() => {
        if (isGlobalActive && isPaused) globalPlay();
    }, [isGlobalActive, isPaused, globalPlay]);

    // === Navigation ===
    const handleTTSNavigation = useCallback(() => {
        // Stub
    }, []);

    const handlePreviousSentence = useCallback(async () => {
        if (isGlobalActive && currentChunkIndex !== null && currentChunkIndex > 0) {
            const target = currentChunkIndex - 1;
            if (await checkAudioAvailability(target)) {
                globalSeek(target);
            } else {
                prioritizeChunk(target);
                addToast('Please wait while this part is generated...', 'info');
            }
        }
    }, [isGlobalActive, currentChunkIndex, globalSeek, checkAudioAvailability, prioritizeChunk, addToast]);

    const handleNextSentence = useCallback(async () => {
        if (isGlobalActive && currentChunkIndex !== null) {
            const target = currentChunkIndex + 1;
            // For next sentence, we might want to be more lenient? The player handles "waiting" automatically for sequential playback.
            // BUT if the user explicitly CLICKS "Next", we might want to ensure it's there?
            // Actually, PersistentPlayer.playChunk ALREADY handles waiting for sequential next.
            // But GlobalSeek forces a jump which might bypass "waiting" state if we aren't careful?
            // PersistentPlayer `playChunk` sets `isBuffering`.
            // So actually, for Next/Prev buttons, we might simply let the Player handle the buffering state!
            // Why? Because `globalSeek` eventually calls `playChunk`.
            // The only reason we intercepted `handleTTS` (click to seek) is to prevent the **Highlight Jump**.

            // If I click Next, I EXPECT the highlight to move to Next. If it buffers, it should show buffering.
            // The issue with Click-to-seek was jumping to a paragraph way down the page and having silence.

            // So actually, maybe we DON'T need to block Next/Prev? 
            // "Prevent the highlight from jumping to un-downloaded audio segments."
            // If I click Next, and it jumps, and buffers... is that bad?
            // Yes, if it stays silent for 5 seconds.

            // I will apply the same strict check.
            if (await checkAudioAvailability(target)) {
                globalSeek(target);
            } else {
                prioritizeChunk(target);
                addToast('Please wait while this part is generated...', 'info');
            }
        }
    }, [isGlobalActive, currentChunkIndex, globalSeek, checkAudioAvailability, prioritizeChunk, addToast]);

    const handlePreviewScroll = useCallback((_percentage: number) => {
        // Placeholder
    }, []);

    const handleSeekToPercentage = useCallback(async (percentage: number) => {
        if (chunks.length > 0) {
            const index = Math.floor((percentage / 100) * chunks.length);
            const target = Math.min(index, chunks.length - 1);

            if (await checkAudioAvailability(target)) {
                globalSeek(target);
            } else {
                prioritizeChunk(target);
                addToast('Please wait while this part is generated...', 'info');
            }
        }
    }, [chunks.length, globalSeek, checkAudioAvailability, prioritizeChunk, addToast]);

    const setPlaybackRate = useCallback((rate: number) => {
        globalSetRate(rate);
    }, [globalSetRate]);


    return {
        chunks,
        currentChunkIndex,
        isSpeaking,
        isProcessing,
        isPaused,
        isBuffering,
        resumeIndex: currentChunkIndex || 0,
        hasFinishedPlayback: !isSpeaking && !isPaused && wasPlayingRef.current === false && currentChunkIndex === chunks.length - 1,
        useKokoroTTS,
        highlightedContent,
        activeChunk,
        bufferedChunksCount: 0,

        handleTTS,
        handleStopTTS,
        pausePlayback,
        resumePlayback,

        handleTTSNavigation,
        handlePreviousSentence,
        handleNextSentence,

        handlePreviewScroll,
        handleSeekToPercentage,

        setPlaybackRate,

        canTTSResume: isPaused,
        anonymousLimit
    };
};
