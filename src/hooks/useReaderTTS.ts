import { useState, useCallback, useRef, useEffect } from 'react';
import { useAnonymousUsageLimit } from './useAnonymousUsageLimit';
import { useTTSChunking } from './tts/useTTSChunking';
import { useTTS } from '../context/TTSContext';
import { useTTSHighlighting } from './tts/useTTSHighlighting';

export interface UseReaderTTSReturn {
    // TTS States
    chunks: string[];
    currentChunkIndex: number | null;
    isSpeaking: boolean;
    isProcessing: boolean;
    isPaused: boolean;
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
        currentBookId: globalBookId,
        currentChunkIndex: globalChunkIndex,
        play: globalPlay,
        pause: globalPause,
        stop: globalStop,
        loadBook,
        setPlaybackRate: globalSetRate,
        seekToChunk: globalSeek
    } = useTTS();

    // === Local Processing ===
    const chunkingHook = useTTSChunking({ text: currentPageText });
    const chunks = chunkingHook.chunks;

    // === Derived State ===
    const isGlobalActive = globalBookId === effectiveBookId;
    const isSpeaking = isGlobalActive && globalIsPlaying;
    const isPaused = isGlobalActive && globalIsPaused;
    const isProcessing = isGlobalActive && globalIsLoading;
    const currentChunkIndex = isGlobalActive ? globalChunkIndex : null;

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
        if (targetIndex !== null) {
            if (!effectiveBookId) {
                console.error('[useReaderTTS] No effectiveBookId for playback');
                return;
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

    const handlePreviousSentence = useCallback(() => {
        if (isGlobalActive && currentChunkIndex !== null && currentChunkIndex > 0) {
            globalSeek(currentChunkIndex - 1);
        }
    }, [isGlobalActive, currentChunkIndex, globalSeek]);

    const handleNextSentence = useCallback(() => {
        if (isGlobalActive && currentChunkIndex !== null) {
            globalSeek(currentChunkIndex + 1);
        }
    }, [isGlobalActive, currentChunkIndex, globalSeek]);

    const handlePreviewScroll = useCallback((_percentage: number) => {
        // Placeholder
    }, []);

    const handleSeekToPercentage = useCallback((percentage: number) => {
        if (chunks.length > 0) {
            const index = Math.floor((percentage / 100) * chunks.length);
            globalSeek(Math.min(index, chunks.length - 1));
        }
    }, [chunks.length, globalSeek]);

    const setPlaybackRate = useCallback((rate: number) => {
        globalSetRate(rate);
    }, [globalSetRate]);


    return {
        chunks,
        currentChunkIndex,
        isSpeaking,
        isProcessing,
        isPaused,
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
