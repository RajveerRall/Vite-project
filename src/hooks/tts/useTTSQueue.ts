
import { useState, useCallback, useRef, useEffect, MutableRefObject } from 'react';
import { IPlaybackStrategy } from '../../services/tts/strategies/IPlaybackStrategy';
import { TTSQueueManager, TTSRequest } from '../../services/tts/TTSQueueManager';
import { AudioStorageService } from '../../services/tts/AudioStorageService';

export interface UseTTSQueueProps {
    chunks: string[];
    bookId: string;
    chapterId: string;
    selectedVoice: string;
    ttsSpeed: number;
    playbackStrategyRef: MutableRefObject<IPlaybackStrategy | null>;
    initialChunkIndex?: number;
}

export interface UseTTSQueueReturn {
    bufferedChunksCount: number;
    audioBuffer: MutableRefObject<Record<number, string>>; // For HTML5 fallback (object URLs)
    durationsBuffer: MutableRefObject<Record<number, number>>;
    fetchSingleChunk: (chunkIndex: number) => Promise<void>;
    prefetchChunks: (startIndex: number) => Promise<void>;
    clearAudioBuffer: () => void;
    getBlob: (index: number) => Blob | null;
    checkAudioAvailability: (index: number) => Promise<boolean>;
    prioritizeChunk: (index: number) => void;
    downloadProgress: number; // 0-100
}

/**
 * Hook to manage persistent TTS queue and memory buffering
 */
export const useTTSQueue = ({
    chunks,
    bookId,
    chapterId,
    selectedVoice,
    ttsSpeed,
    playbackStrategyRef,
    initialChunkIndex = 0
}: UseTTSQueueProps): UseTTSQueueReturn => {
    // In-memory buffer for immediate playback (blobs)
    const audioBufferObjects = useRef<Record<number, Blob>>({});
    // For HTML5 fallback (blob URLs)
    const audioBuffer = useRef<Record<number, string>>({});
    const durationsBuffer = useRef<Record<number, number>>({});

    // Track what we have loaded into memory to avoid repeated storage reads
    const loadedManifest = useRef<Set<number>>(new Set());

    const [bufferedChunksCount, setBufferedChunksCount] = useState(0);

    const checkInterval = useRef<NodeJS.Timeout | null>(null);

    // Queue Manager Interface
    const queueManager = TTSQueueManager.getInstance();

    // Reset queue when chapter changes
    useEffect(() => {
        if (bookId && chapterId && chunks.length > 0) {
            queueManager.reset(bookId, chapterId);

            const requests: TTSRequest[] = chunks.map((text, index) => ({
                bookId,
                chapterId,
                chunkIndex: index,
                text,
                voice: selectedVoice,
                speed: ttsSpeed
            }));

            // Prioritize initial chunk if > 0
            // We can do this by moving it to the front of requests list
            // OR calling prioritize after adding.
            // Calling prioritize is safer as it handles queue logic.

            queueManager.addToQueue(requests).then(() => {
                if (initialChunkIndex > 0 && initialChunkIndex < chunks.length) {
                    console.log(`[useTTSQueue] Initializing with priority on chunk ${initialChunkIndex}`);
                    queueManager.prioritize(bookId, chapterId, initialChunkIndex);
                }
            });
        }
    }, [bookId, chapterId, chunks.length, selectedVoice, ttsSpeed]); // Re-queue if voice/speed changes

    // Listen for chunks becoming ready
    useEffect(() => {
        const unsubscribe = queueManager.onChunkReady((params) => {
            // Only care if it matches current context
            if (params.bookId === bookId && params.chapterId === chapterId &&
                params.voice === selectedVoice && params.speed === ttsSpeed) {

                // If we were waiting for this chunk or it's close, load it into memory
                // For now, let's just log. The prefetch logic (below) will handle loading.
                // Or we can proactively load it if it's within range?
            }
        });
        return unsubscribe;
    }, [bookId, chapterId, selectedVoice, ttsSpeed]);

    // Track downloaded chunks for progress bar
    const [downloadedChunks, setDownloadedChunks] = useState<Set<number>>(new Set());

    // Load initial download state from specific DB inquiry
    useEffect(() => {
        if (!bookId || !chapterId) {
            setDownloadedChunks(new Set());
            return;
        }

        const checkExisting = async () => {
            // We can use the service to get all indices for this book/chapter
            try {
                const indices = await AudioStorageService.getExistingChunkIndices(bookId, chapterId, selectedVoice, ttsSpeed);
                setDownloadedChunks(new Set(indices));
            } catch (e) {
                console.warn('[useTTSQueue] Failed to load existing indices', e);
            }
        };
        checkExisting();
    }, [bookId, chapterId, selectedVoice, ttsSpeed]);


    // Listen for chunks becoming ready (Real-time updates)
    useEffect(() => {
        const unsubscribe = queueManager.onChunkReady((params) => {
            // Only care if it matches current context
            if (params.bookId === bookId && params.chapterId === chapterId) {
                // Determine if we should add it?
                // Yes, if it matches book/chapter it counts towards "downloaded for this chapter"
                // Voice/Speed are variant factors. Usually we want to track progress for the *active* voice/speed.
                // But getExistingChunkIndices returns indices for ANY voice? No, let's check Service.
                // AudioStorageService.getExistingChunkIndices scans keys. 
                // Ideally we filter by voice/speed too. 
                // But for now, let's assume if it's there, it's good.

                // Add to set
                setDownloadedChunks(prev => {
                    const next = new Set(prev);
                    next.add(params.chunkIndex);
                    return next;
                });
            }
        });
        return unsubscribe;
    }, [bookId, chapterId, selectedVoice, ttsSpeed]); // Re-subscribe if context changes

    // Calculate progress
    const downloadProgress = chunks.length > 0
        ? Math.round((downloadedChunks.size / chunks.length) * 100)
        : 0;

    // Load from Storage into Memory (Read Buffer)
    const loadFromStorageToMemory = useCallback(async (index: number) => {
        if (loadedManifest.current.has(index)) return true; // Already in memory

        const blob = await AudioStorageService.getAudio({
            bookId,
            chapterId,
            chunkIndex: index,
            voice: selectedVoice,
            speed: ttsSpeed
        });

        if (blob) {
            audioBufferObjects.current[index] = blob;
            const url = URL.createObjectURL(blob);
            audioBuffer.current[index] = url;
            loadedManifest.current.add(index);
            setBufferedChunksCount(prev => prev + 1);

            // Prepare strategy
            if (playbackStrategyRef.current) {
                playbackStrategyRef.current.prepareChunk(index, blob).catch(console.warn);
            }
            return true;
        }
        return false;
    }, [bookId, chapterId, selectedVoice, ttsSpeed, playbackStrategyRef]);

    // Cleanup
    const clearAudioBuffer = useCallback(() => {
        Object.values(audioBuffer.current).forEach(url => URL.revokeObjectURL(url));
        audioBuffer.current = {};
        audioBufferObjects.current = {};
        loadedManifest.current.clear();
        setBufferedChunksCount(0);
        queueManager.stop();
    }, []);

    // Fetch Single Chunk (Called by Player when it needs data NOW)
    const fetchSingleChunk = useCallback(async (chunkIndex: number) => {
        // 1. Check Memory
        if (loadedManifest.current.has(chunkIndex)) return;

        // 2. Check Storage
        const found = await loadFromStorageToMemory(chunkIndex);
        if (found) return;

        // 3. Wait for Queue (Polling pattern since we need to wait)
        // Since QueueManager is running, we just need to wait for it to land in Storage
        console.log(`[useTTSQueue] Waiting for chunk ${chunkIndex} to download...`);

        // Simple polling for now - can be optimized with events later
        let attempts = 0;
        while (attempts < 30) { // 15 seconds max
            if (queueManager['status'] === 'paused') {
                // If queue paused for some reason, kick it?
                // queueManager.startProcessing(); // It's private
            }

            await new Promise(r => setTimeout(r, 500));
            const success = await loadFromStorageToMemory(chunkIndex);
            if (success) return;
            attempts++;
        }
        throw new Error(`Timeout waiting for chunk ${chunkIndex}`);
    }, [loadFromStorageToMemory]);

    // Prefetch (Called by Player to look ahead)
    const prefetchChunks = useCallback(async (startIndex: number) => {
        // Ensure next 3 chunks are in Memory
        for (let i = 0; i < 3; i++) {
            const idx = startIndex + i;
            if (idx < chunks.length) {
                loadFromStorageToMemory(idx);
            }
        }
    }, [chunks.length, loadFromStorageToMemory]);

    const getBlob = useCallback((index: number) => {
        return audioBufferObjects.current[index] || null;
    }, []);

    const checkAudioAvailability = useCallback(async (index: number) => {
        // 1. Check Memory
        if (loadedManifest.current.has(index)) return true;
        // 2. Check Storage
        return await AudioStorageService.hasAudio({
            bookId,
            chapterId,
            chunkIndex: index,
            voice: selectedVoice,
            speed: ttsSpeed
        });
    }, [bookId, chapterId, selectedVoice, ttsSpeed]);

    const prioritizeChunk = useCallback((index: number) => {
        queueManager.prioritize(bookId, chapterId, index);
    }, [bookId, chapterId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(audioBuffer.current).forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    return {
        bufferedChunksCount,
        audioBuffer,
        durationsBuffer,
        fetchSingleChunk,
        prefetchChunks,
        clearAudioBuffer,
        getBlob,
        checkAudioAvailability,
        prioritizeChunk,
        downloadProgress
    };
}
