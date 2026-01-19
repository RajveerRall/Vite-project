import { useState, useCallback, useRef, useEffect, MutableRefObject } from 'react';
import { IPlaybackStrategy } from '../../services/tts/strategies/IPlaybackStrategy';
import { getBlobDurationSeconds } from '../../utils/audioUtils';

export interface UseTTSBufferingProps {
    chunks: string[];
    currentChunkIndex: number | null;
    selectedVoice: string;
    ttsSpeed: number;
    playbackStrategyRef: MutableRefObject<IPlaybackStrategy | null>;
    readerInstanceId: string;
}

export interface UseTTSBufferingReturn {
    bufferedChunksCount: number;
    setBufferedChunksCount: React.Dispatch<React.SetStateAction<number>>;
    audioBuffer: MutableRefObject<Record<number, string>>;
    durationsBuffer: MutableRefObject<Record<number, number>>;
    fetchSingleChunk: (chunkIndex: number) => Promise<void>;
    prefetchChunks: (startIndex: number) => Promise<void>;
    clearAudioBuffer: () => void;
}

// Constants
const PREFETCH_CHUNK_COUNT = 4;
const ONE_MINUTE_MS = 60 * 1000;
const MAX_AUDIO_BUFFER_SIZE = 10;

/**
 * Hook for managing TTS audio buffering and prefetching
 */
export const useTTSBuffering = ({
    chunks,
    currentChunkIndex,
    selectedVoice,
    ttsSpeed,
    playbackStrategyRef,
    readerInstanceId
}: UseTTSBufferingProps): UseTTSBufferingReturn => {
    // Refs
    const audioBuffer = useRef<Record<number, string>>({});
    const durationsBuffer = useRef<Record<number, number>>({});
    const inFlightPrefetchRef = useRef<Set<number>>(new Set());
    const bufferVoiceRef = useRef<string>(selectedVoice);
    const prevVoiceRef = useRef<string>(selectedVoice);

    // State
    const [bufferedChunksCount, setBufferedChunksCount] = useState(0);

    // Refs for props to avoid stale closures in async functions
    const selectedVoiceRef = useRef(selectedVoice);
    useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);



    // === Clear audio buffer function ===
    const clearAudioBuffer = useCallback(() => {
        const bufferUrls = Object.values(audioBuffer.current);
        bufferUrls.forEach(url => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        audioBuffer.current = {};
        setBufferedChunksCount(0);
        // Update the voice tracking ref
        bufferVoiceRef.current = selectedVoiceRef.current;
    }, [readerInstanceId]);

    // === Clean up old chunks when buffer exceeds limit ===
    const cleanupOldChunks = useCallback((currentIndex: number) => {
        const bufferKeys = Object.keys(audioBuffer.current).map(Number);
        if (bufferKeys.length <= MAX_AUDIO_BUFFER_SIZE) return;

        // Protect current chunk and nearby chunks (±2 range)
        const protectedChunks = new Set<number>();
        for (let i = -2; i <= 2; i++) {
            protectedChunks.add(currentIndex + i);
        }

        // Find chunks to evict (oldest, non-protected chunks)
        const chunksToEvict = bufferKeys
            .filter(key => !protectedChunks.has(key))
            .sort((a, b) => a - b) // Oldest first
            .slice(0, bufferKeys.length - MAX_AUDIO_BUFFER_SIZE);

        chunksToEvict.forEach(chunkIndex => {
            const url = audioBuffer.current[chunkIndex];
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
            delete audioBuffer.current[chunkIndex];
            setBufferedChunksCount(prev => Math.max(0, prev - 1));
        });
    }, [readerInstanceId]);

    // === Handle voice changes ===
    useEffect(() => {
        // Only clear buffer if voice actually changed
        if (Object.keys(audioBuffer.current).length > 0 &&
            prevVoiceRef.current !== selectedVoice) {
            clearAudioBuffer();
        }
        prevVoiceRef.current = selectedVoice;
    }, [selectedVoice, clearAudioBuffer]);

    // === Fetch single chunk helper ===
    const fetchSingleChunk = useCallback(async (chunkIndex: number): Promise<void> => {
        if (chunks.length === 0 || chunkIndex < 0 || chunkIndex >= chunks.length) return;
        if (audioBuffer.current[chunkIndex] || currentChunkIndex === chunkIndex) return; // Already cached

        // Check if already in flight
        if (inFlightPrefetchRef.current.has(chunkIndex)) {
            return;
        }

        // Mark as in-flight
        inFlightPrefetchRef.current.add(chunkIndex);

        try {
            const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
            const textChunk = chunks[chunkIndex];
            const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts` : '/api/tts';

            const params = new URLSearchParams({
                text: textChunk,
                voice: selectedVoiceRef.current,
                format: 'audio-24khz-48kbitrate-mono-mp3'
            });

            if (ttsSpeed !== 1) {
                const speedPercent = Math.round((ttsSpeed - 1) * 100);
                const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
                params.set('rate', speedParam);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            let response;
            try {
                response = await fetch(`${apiUrl}?${params.toString()}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    console.warn(`[FetchSingle] TTS request timeout for chunk #${chunkIndex} after 30 seconds`);
                    return;
                }
                throw fetchError;
            }

            if (!response.ok) return;

            const audioBlob = await response.blob();
            if (audioBlob.size === 0) {
                console.warn(`[FetchSingle] Received empty audio blob for chunk #${chunkIndex}`);
                return;
            }

            const strategy = playbackStrategyRef.current;
            const isSeamless = strategy && (strategy as any).getStrategyType?.() === 'seamless';

            if (isSeamless && strategy) {
                try {
                    await strategy.prepareChunk(chunkIndex, audioBlob);
                } catch (err) {
                    console.warn(`[FetchSingle] Failed to pre-decode chunk #${chunkIndex} for seamless playback`, err);
                }
            }

            try {
                const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
                const seconds = headerSeconds > 0 ? headerSeconds : await getBlobDurationSeconds(audioBlob);
                durationsBuffer.current[chunkIndex] = seconds;
            } catch { }

            const audioUrl = URL.createObjectURL(audioBlob);
            audioBuffer.current[chunkIndex] = audioUrl;
            bufferVoiceRef.current = selectedVoiceRef.current;
            setBufferedChunksCount(prev => prev + 1);

            // Clean up old chunks
            cleanupOldChunks(chunkIndex);
        } catch (error) {
            console.warn(`[FetchSingle] Failed to fetch chunk #${chunkIndex}`, error);
        } finally {
            inFlightPrefetchRef.current.delete(chunkIndex);
        }
    }, [chunks, currentChunkIndex, ttsSpeed, cleanupOldChunks, getBlobDurationSeconds, playbackStrategyRef]);

    // === Prefetch chunks function ===
    const prefetchChunks = useCallback(async (startIndex: number) => {
        if (chunks.length === 0) return;

        const normalizedStart = Math.max(0, startIndex);
        if (normalizedStart >= chunks.length) return;

        // Check if chunks in this range are already being prefetched
        const chunksToCheck: number[] = [];
        for (let i = 0; i < PREFETCH_CHUNK_COUNT && normalizedStart + i < chunks.length; i++) {
            chunksToCheck.push(normalizedStart + i);
        }

        // If all chunks are already in flight, skip this prefetch
        const allInFlight = chunksToCheck.every(idx => inFlightPrefetchRef.current.has(idx));
        if (allInFlight && chunksToCheck.length > 0) {
            return;
        }

        const chunksToFetch = chunks.slice(normalizedStart, normalizedStart + PREFETCH_CHUNK_COUNT);
        if (chunksToFetch.length === 0) return;

        // Mark chunks as in-flight
        chunksToCheck.forEach(idx => inFlightPrefetchRef.current.add(idx));

        const strategy = playbackStrategyRef.current;
        const isSeamless = strategy && (strategy as any).getStrategyType?.() === 'seamless';

        for (let i = 0; i < chunksToFetch.length; i++) {
            const chunkIndex = normalizedStart + i;
            if (audioBuffer.current[chunkIndex] || currentChunkIndex === chunkIndex) continue;

            try {
                const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
                const textChunk = chunksToFetch[i];
                const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts` : '/api/tts';

                const params = new URLSearchParams({
                    text: textChunk,
                    voice: selectedVoiceRef.current,
                    format: 'audio-24khz-48kbitrate-mono-mp3'
                });

                if (ttsSpeed !== 1) {
                    const speedPercent = Math.round((ttsSpeed - 1) * 100);
                    const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
                    params.set('rate', speedParam);
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                let response;
                try {
                    response = await fetch(`${apiUrl}?${params.toString()}`, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                } catch (fetchError: any) {
                    clearTimeout(timeoutId);
                    if (fetchError.name === 'AbortError') {
                        console.warn(`[Prefetch] TTS request timeout for chunk #${chunkIndex} after 30 seconds`);
                        continue;
                    }
                    throw fetchError;
                }

                if (!response.ok) continue;

                const audioBlob = await response.blob();
                if (audioBlob.size === 0) {
                    console.warn(`[Prefetch] Received empty audio blob for chunk #${chunkIndex}. Skipping.`);
                    continue;
                }

                if (isSeamless && strategy) {
                    try {
                        await strategy.prepareChunk(chunkIndex, audioBlob);
                    } catch (err) {
                        console.warn(`[Prefetch] Failed to pre-decode chunk #${chunkIndex} for seamless playback`, err);
                    }
                }

                try {
                    const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
                    const seconds = headerSeconds > 0 ? headerSeconds : await getBlobDurationSeconds(audioBlob);
                    durationsBuffer.current[chunkIndex] = seconds;
                } catch { }

                const audioUrl = URL.createObjectURL(audioBlob);
                audioBuffer.current[chunkIndex] = audioUrl;
                setBufferedChunksCount(prev => prev + 1);

            } catch (error) {
                console.warn(`[Prefetch] Failed to fetch chunk #${chunkIndex}`, error);
            } finally {
                inFlightPrefetchRef.current.delete(chunkIndex);
            }
        }
    }, [chunks, currentChunkIndex, ttsSpeed, getBlobDurationSeconds, playbackStrategyRef]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(audioBuffer.current).forEach(url => {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, []);

    return {
        bufferedChunksCount,
        setBufferedChunksCount,
        audioBuffer,
        durationsBuffer,
        fetchSingleChunk,
        prefetchChunks,
        clearAudioBuffer
    };
};
