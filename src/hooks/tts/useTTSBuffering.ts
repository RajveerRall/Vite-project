
import { useState, useCallback, useRef, useEffect, MutableRefObject } from 'react';
import { IPlaybackStrategy } from '../../services/tts/strategies/IPlaybackStrategy';
import { getBlobDurationSeconds } from '../../utils/audioUtils';

export interface UseTTSBufferingProps {
    chunks: string[];
    selectedVoice: string;
    ttsSpeed: number;
    playbackStrategyRef: MutableRefObject<IPlaybackStrategy | null>;
}

export interface UseTTSBufferingReturn {
    bufferedChunksCount: number;
    setBufferedChunksCount: React.Dispatch<React.SetStateAction<number>>;
    audioBuffer: MutableRefObject<Record<number, string>>;
    durationsBuffer: MutableRefObject<Record<number, number>>;
    fetchSingleChunk: (chunkIndex: number) => Promise<void>;
    prefetchChunks: (startIndex: number) => Promise<void>;
    clearAudioBuffer: () => void;
    getBlob: (index: number) => Blob | null;
}

// Constants
const PREFETCH_CHUNK_COUNT = 6;
const MAX_AUDIO_BUFFER_SIZE = 15;

/**
 * Hook for managing TTS audio buffering and prefetching
 */
export const useTTSBuffering = ({
    chunks,
    selectedVoice,
    ttsSpeed,
    playbackStrategyRef
}: UseTTSBufferingProps): UseTTSBufferingReturn => {
    // Refs
    // Stores URL strings for HTML5 playback
    const audioBuffer = useRef<Record<number, string>>({});
    // Stores actual Blob objects for Seamless playback (Web Audio API)
    const audioBufferObjects = useRef<Record<number, Blob>>({});
    const durationsBuffer = useRef<Record<number, number>>({});
    const inFlightRequestsRef = useRef<Record<number, Promise<void> | undefined>>({});
    const bufferVoiceRef = useRef<string>(selectedVoice);
    const prevVoiceRef = useRef<string>(selectedVoice);

    // NEW: AbortController ref to cancel pending requests
    const abortControllerRef = useRef<AbortController | null>(null);

    // State
    const [bufferedChunksCount, setBufferedChunksCount] = useState(0);

    // Refs for props
    const selectedVoiceRef = useRef(selectedVoice);
    useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);

    // === Clear audio buffer function ===
    const clearAudioBuffer = useCallback(() => {
        // Abort any ongoing fetches
        if (abortControllerRef.current) {
            console.log('[Buffering] Aborting pending requests due to buffer clear');
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        const bufferUrls = Object.values(audioBuffer.current);
        bufferUrls.forEach(url => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        audioBuffer.current = {};
        audioBufferObjects.current = {};
        setBufferedChunksCount(0);
        // Update the voice tracking ref
        bufferVoiceRef.current = selectedVoiceRef.current;
    }, []);

    // === Clean up old chunks when buffer exceeds limit ===
    const cleanupOldChunks = useCallback((currentIndex: number) => {
        const bufferKeys = Object.keys(audioBuffer.current).map(Number);
        if (bufferKeys.length <= MAX_AUDIO_BUFFER_SIZE) return;

        // Protect current chunk and nearby chunks (4 behind, 4 ahead)
        const protectedChunks = new Set<number>();
        for (let i = -4; i <= 4; i++) {
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
            delete audioBufferObjects.current[chunkIndex];
            setBufferedChunksCount(prev => Math.max(0, prev - 1));
        });
    }, []);

    // === Handle voice changes ===
    useEffect(() => {
        // Only clear buffer if voice actually changed
        if (Object.keys(audioBuffer.current).length > 0 &&
            prevVoiceRef.current !== selectedVoice) {
            clearAudioBuffer();
        }
        prevVoiceRef.current = selectedVoice;
    }, [selectedVoice, clearAudioBuffer]);

    // === Internal fetch logic (reusable) ===
    const internalFetchChunk = useCallback(async (chunkIndex: number): Promise<void> => {
        if (chunks.length === 0 || chunkIndex < 0 || chunkIndex >= chunks.length) return;
        if (audioBufferObjects.current[chunkIndex]) return;

        console.log(`[Buffering] Starting fetch for chunk #${chunkIndex}.`);

        try {
            const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
            const textChunk = chunks[chunkIndex];
            const apiUrl = (import.meta.env.DEV || !ttsApiUrl) ? '/api/tts' : `${ttsApiUrl}/api/tts`;

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

            if (!abortControllerRef.current) {
                abortControllerRef.current = new AbortController();
            }
            const signal = abortControllerRef.current.signal;

            const response = await fetch(`${apiUrl}?${params.toString()}`, { signal });

            if (!response.ok) {
                console.error(`[Buffering] TTS Fetch failed for chunk #${chunkIndex}: ${response.status}`);
                return;
            }

            const audioBlob = await response.blob();
            if (audioBlob.size === 0) return;

            const strategy = playbackStrategyRef.current;
            if (strategy) {
                try {
                    await strategy.prepareChunk(chunkIndex, audioBlob);
                } catch (err) {
                    console.error(`[Buffering] Failed to prepare chunk #${chunkIndex}:`, err);
                }
            }

            try {
                const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
                const seconds = headerSeconds > 0 ? headerSeconds : await getBlobDurationSeconds(audioBlob);
                durationsBuffer.current[chunkIndex] = seconds;
            } catch { }

            const audioUrl = URL.createObjectURL(audioBlob);
            audioBuffer.current[chunkIndex] = audioUrl;
            audioBufferObjects.current[chunkIndex] = audioBlob;
            setBufferedChunksCount(prev => prev + 1);

            cleanupOldChunks(chunkIndex);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.warn(`[Buffering] Failed to fetch chunk #${chunkIndex}`, error);
            }
        } finally {
            delete inFlightRequestsRef.current[chunkIndex];
        }
    }, [chunks, ttsSpeed, cleanupOldChunks, playbackStrategyRef]);

    // === Fetch single chunk helper ===
    const fetchSingleChunk = useCallback(async (chunkIndex: number): Promise<void> => {
        // If already in memory, we are done
        if (audioBufferObjects.current[chunkIndex]) return;

        // If a request is already in flight, await it
        if (inFlightRequestsRef.current[chunkIndex] !== undefined) {
            console.log(`[Buffering] Awaiting in-flight request for chunk #${chunkIndex}`);
            await inFlightRequestsRef.current[chunkIndex];
            return;
        }

        // Otherwise, start a new one and track its promise
        const promise = internalFetchChunk(chunkIndex);
        inFlightRequestsRef.current[chunkIndex] = promise;
        return await promise;
    }, [internalFetchChunk]);

    // === Prefetch chunks function ===
    const prefetchChunks = useCallback(async (startIndex: number) => {
        if (chunks.length === 0) return;

        const normalizedStart = Math.max(0, startIndex);
        const end = Math.min(normalizedStart + PREFETCH_CHUNK_COUNT, chunks.length);

        for (let i = normalizedStart; i < end; i++) {
            // Already have it?
            if (audioBufferObjects.current[i]) continue;
            // Already fetching it?
            if (inFlightRequestsRef.current[i] !== undefined) continue;

            // Start prefetch (fire and forget, it will clean itself up in finally)
            const promise = internalFetchChunk(i);
            inFlightRequestsRef.current[i] = promise;
        }
    }, [chunks, internalFetchChunk]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(audioBuffer.current).forEach(url => {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
            audioBufferObjects.current = {};
        };
    }, []);

    const getBlob = useCallback((index: number) => {
        return audioBufferObjects.current[index] || null;
    }, []);

    return {
        bufferedChunksCount,
        setBufferedChunksCount,
        audioBuffer,
        durationsBuffer,
        fetchSingleChunk,
        prefetchChunks,
        clearAudioBuffer,
        getBlob
    };
};
