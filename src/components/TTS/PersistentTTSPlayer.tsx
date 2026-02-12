
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTTS } from '../../context/TTSContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LocalBookRepository } from '../../services/books/repository/LocalBookRepository';
import { EpubParserService, EpubStructure } from '../../services/books/EpubParserService';
import { BookContentService } from '../../services/books/BookContentService';
import { useTTSChunking } from '../../hooks/tts/useTTSChunking';
import { useTTSQueue } from '../../hooks/tts/useTTSQueue'; // New Hook
import { createAdaptivePlaybackStrategy } from '../../services/tts/strategies/AdaptivePlaybackStrategy';
import { IPlaybackStrategy } from '../../services/tts/strategies/IPlaybackStrategy';
import { MediaSessionService } from '../../services/media/MediaSessionService';

export const PersistentTTSPlayer: React.FC = () => {
    const {
        currentBookId,
        currentBookTitle,
        currentBookAuthor,
        currentChapterId,
        currentChunkIndex,
        isPlaying,
        isPaused,
        isLoading,
        playbackRate,
        setTTSState,
        registerCapabilities
    } = useTTS();

    const { addToast } = useToast();
    const { user } = useAuth();

    // State
    const [structure, setStructure] = useState<EpubStructure | null>(null);
    const [currentText, setCurrentText] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Instances
    const playerInstanceId = useRef(`PersistentPlayer_${Date.now()}`).current;
    const previousChapterIdRef = useRef<string | null>(null);

    // Playback Strategy
    const playbackStrategyRef = useRef<IPlaybackStrategy | null>(null);
    const lastPlayedChunkRef = useRef<number | null>(null);

    // Initialize Strategy
    if (!playbackStrategyRef.current) {
        playbackStrategyRef.current = createAdaptivePlaybackStrategy({
            playbackRate,
            instanceId: playerInstanceId,
            forceStrategy: 'auto'
        });
    }

    // --- Hooks ---
    // 1. Chunking
    const { chunks } = useTTSChunking({ text: currentText });

    // 2. Persistent Queue & Buffering (The New Logic)
    const {
        audioBuffer, // For HTML5 fallback URLs
        fetchSingleChunk, // Can signal "I need this NOW"
        prefetchChunks, // Signals "I will need this soon"
        clearAudioBuffer, // Clears memory buffer (not storage)
        getBlob, // Get blob from memory
        checkAudioAvailability,
        prioritizeChunk,
        downloadProgress
    } = useTTSQueue({
        chunks,
        bookId: currentBookId || '',
        chapterId: currentChapterId || '',
        selectedVoice: 'en-US-BrianMultilingualNeural', // TODO: Get from settings
        ttsSpeed: playbackRate,
        playbackStrategyRef,
        initialChunkIndex: currentChunkIndex // Pass this down
    });

    // --- Effects ---

    // 1. Load Book Structure (Spine/TOC) when book changes
    useEffect(() => {
        // IMMEDIATE RESET: Wipe old book data from memory when ID changes
        setStructure(null);
        setCurrentText('');
        clearAudioBuffer();

        if (playbackStrategyRef.current) {
            try {
                playbackStrategyRef.current.stop();
                playbackStrategyRef.current.cleanup();
            } catch (e) {
                console.warn('Error cleanup strategy:', e);
            }
            // Re-initialize 
            playbackStrategyRef.current = createAdaptivePlaybackStrategy({
                playbackRate,
                instanceId: playerInstanceId,
                forceStrategy: 'auto'
            });
        }

        const loadBook = async () => {
            if (!currentBookId) return;
            try {
                const repo = new LocalBookRepository(user?.id);
                const file = await repo.getBookFile(currentBookId);

                if (!file) {
                    setError('Book file not found');
                    return;
                }

                const struct = await EpubParserService.parseEpub(file);
                setStructure(struct);

                if (!currentBookTitle || !currentBookAuthor) {
                    setTTSState({
                        currentBookTitle: currentBookTitle || struct.metadata.title || null,
                        currentBookAuthor: currentBookAuthor || struct.metadata.author || null
                    });
                }

                setError(null);
            } catch (e) {
                console.error('[PersistentPlayer] Error loading book:', e);
                setError('Failed to load book');
            }
        };

        if (currentBookId) {
            loadBook();
        } else {
            setStructure(null);
            setCurrentText('');
            setTTSState({
                currentBookTitle: null,
                currentBookAuthor: null,
                currentChapterTitle: null
            });
            if (playbackStrategyRef.current) {
                playbackStrategyRef.current.setMetadata({ title: 'YoRead', author: 'Ebook Reader' });
            }
        }
    }, [currentBookId, user?.id]);

    // Track last seen state to detect transitions
    const lastChapterIdRef = useRef<string | null>(currentChapterId);
    const lastChunkIndexRef = useRef<number>(currentChunkIndex);

    // 2. Load Chapter Content 
    useEffect(() => {
        const loadChapter = async () => {
            if (!structure || !currentChapterId) {
                lastChapterIdRef.current = currentChapterId;
                lastChunkIndexRef.current = currentChunkIndex;
                return;
            }

            // If we are NOT loading, but we have an ID and NO text, we MUST load (Hydration case)
            // Or if isLoading is true (Explicit load case)
            const needsLoad = isLoading || (currentChapterId && !currentText);

            if (!needsLoad) {
                // Nothing to do
                return;
            }

            const chapterChanged = lastChapterIdRef.current !== currentChapterId;
            const chunkChanged = lastChunkIndexRef.current !== currentChunkIndex;

            if (chapterChanged && !chunkChanged) {
                console.log(`[PersistentPlayer] Natural transition. Resetting index to 0.`);
                setTTSState({ currentChunkIndex: 0 });
            }

            lastChapterIdRef.current = currentChapterId;
            lastChunkIndexRef.current = currentChunkIndex;

            // Short circuit if same chapter
            if (previousChapterIdRef.current === currentChapterId && currentText) {
                console.log('[PersistentPlayer] Chapter already loaded, finalizing start');
                setTTSState({ isLoading: false });
                return;
            }

            try {
                if (!isLoading) {
                    setTTSState({ isLoading: true });
                }

                if (playbackStrategyRef.current) {
                    try { playbackStrategyRef.current.stop(); } catch (e) { }
                }
                clearAudioBuffer();
                setCurrentText('');

                previousChapterIdRef.current = currentChapterId;

                const spineItem = structure.spine.find(href => href.includes(currentChapterId) || currentChapterId.includes(href));
                const targetHref = spineItem || currentChapterId;

                if (!targetHref) {
                    console.warn('[PersistentPlayer] Could not find spine item for chapter:', currentChapterId);
                    setTTSState({ isLoading: false });
                    return;
                }

                const { text } = await BookContentService.loadPage(structure.zip, targetHref);
                setCurrentText(text); // Triggers chunking -> Triggers useTTSQueue
                setTTSState({ isLoading: false });

                if (playbackStrategyRef.current) {
                    playbackStrategyRef.current.setMetadata({
                        title: currentBookTitle || 'Untitled Book',
                        author: currentBookAuthor || 'Unknown Author'
                    });
                }

                // Initialize media session for lock screen controls
                const chapterTitle = structure.toc.find(item =>
                    item.href.includes(currentChapterId) || currentChapterId.includes(item.href)
                )?.label || 'Chapter';

                await MediaSessionService.initialize({
                    bookTitle: currentBookTitle || structure.metadata.title || 'Untitled Book',
                    bookAuthor: currentBookAuthor || structure.metadata.author || 'Unknown Author',
                    chapterTitle: chapterTitle,
                    coverUrl: undefined // TODO: Add cover URL if available
                }, isPlaying && !isPaused);

                await MediaSessionService.listen();
            } catch (e) {
                console.error('[PersistentPlayer] Error loading chapter:', e);
                setTTSState({ isLoading: false });
            }
        };

        loadChapter();
    }, [currentChapterId, structure, clearAudioBuffer, isLoading]);

    // Error reporting
    useEffect(() => {
        if (error) {
            addToast(error, 'error');
        }
    }, [error, addToast]);


    // Helper: Play Chunk
    const playChunk = useCallback(async (index: number) => {
        if (index < 0 || index >= chunks.length) {
            setTTSState({ isPlaying: false });
            return;
        }

        const strategy = playbackStrategyRef.current;
        if (!strategy) return;

        try {
            const isSeamless = (strategy as any).getStrategyType?.() === 'seamless';

            // 1. Try to get blob from Memory
            let source: string | Blob | undefined = getBlob(index) || undefined;
            if (!isSeamless && !source) {
                // If HTML5 and no blob, check if we have a URL? 
                // useTTSQueue manages blobs mostly, but provides audioBuffer for URLs.
                source = audioBuffer.current[index];
            }

            // 2. If missing, FETCH IT (This will block until Queue downloads it)
            if (!source) {
                console.log(`[PersistentPlayer] Source missing for chunk ${index}, waiting for Queue...`);

                // CRITICAL: Stop any previous playback immediately so we don't have "ghost audio" while buffering
                // and so the user knows we are loading the NEW content.
                if (strategy.isPlaying()) {
                    strategy.pause();
                }

                setTTSState({ isBuffering: true });
                try {
                    await fetchSingleChunk(index); // This waits for storage
                } finally {
                    setTTSState({ isBuffering: false });
                }

                // Retry get
                source = getBlob(index) || audioBuffer.current[index];
            }

            // 3. Prepare for seamless
            if (isSeamless && source instanceof Blob) {
                await strategy.prepareChunk(index, source);
            }

            if (!source) {
                console.error(`[PersistentPlayer] Failed to load source for chunk ${index}.`);
                // If we failed to get it (timeout etc), we MUST pause the player
                setTTSState({ isPlaying: false, isPaused: true });
                return;
            }

            // 4. Play
            await strategy.play(source, index);

            // 5. Look Ahead (Prefetch next few chunks into Memory)
            prefetchChunks(index + 1);

        } catch (e) {
            console.error('[PersistentPlayer] Playback error:', e);
            // Ensure we don't stay in a "Playing" state if it crashed
            setTTSState({ isPlaying: false, isPaused: true, isBuffering: false });
        }
    }, [chunks, setTTSState, fetchSingleChunk, prefetchChunks, audioBuffer, getBlob]);


    const lastContextIndexRef = useRef<number>(currentChunkIndex);

    // 3. Playback Control
    useEffect(() => {
        const strategy = playbackStrategyRef.current;
        if (!strategy) return;

        if (isLoading) {
            // console.log('[PersistentPlayer] Skipping effect: is Loading');
            lastContextIndexRef.current = currentChunkIndex;
            return;
        }

        // DEBUG LOG
        console.log(`[PersistentPlayer] State Update: playing=${isPlaying}, paused=${isPaused}, chunks=${chunks.length}, idx=${currentChunkIndex}`);

        if (isPlaying && !isPaused && chunks.length > 0) {
            const strategyChunkIndex = strategy.getCurrentChunkIndex();
            const isPlayingWrongChunk = strategyChunkIndex !== null && strategyChunkIndex !== currentChunkIndex;
            const isNotPlaying = !strategy.isPlaying();
            const isDuplicateCall = lastPlayedChunkRef.current === currentChunkIndex && strategy.isPlaying();

            console.log(`[PersistentTTSPlayer] Play Check: chunk=${currentChunkIndex}, strategyIdx=${strategyChunkIndex}, isNotPlaying=${isNotPlaying}, isDuplicate=${isDuplicateCall}`);

            if ((isNotPlaying || isPlayingWrongChunk) && !isDuplicateCall) {
                console.log(`[PersistentPlayer] Navigation/Start: chunk ${currentChunkIndex}.`);
                lastPlayedChunkRef.current = currentChunkIndex;
                playChunk(currentChunkIndex);
            }
        } else {
            if (isPlaying && !isPaused && chunks.length === 0) {
                console.log('[PersistentTTSPlayer] Waiting for chunks to load... setting buffering.');
                // Determine if we should be buffering or if it's a permanent empty state?
                // For now, assume it's transient (startup)
                setTTSState({ isBuffering: true });
            } else if (chunks.length > 0 && strategy.isPlaying() === false && isPlaying && !isPaused) {
                console.log('[PersistentPlayer] Edge Case: Has Chunks, Should Play, But Strategy Stopped. Retrying.');
                // Force retry
                playChunk(currentChunkIndex);
            }

            if (strategy.isPlaying() && (!isPlaying || isPaused)) {
                console.log('[PersistentPlayer] Pausing strategy.');
                strategy.pause();
            }
            if (!isPlaying && !isPaused) {
                lastPlayedChunkRef.current = null;
            }
        }

        lastContextIndexRef.current = currentChunkIndex;
    }, [isPlaying, isPaused, isLoading, chunks, currentChunkIndex, playChunk, setTTSState]);

    // Sync media session with playback state
    useEffect(() => {
        if (isPlaying && !isPaused) {
            MediaSessionService.updatePlaybackState(true).catch(console.error);
        } else if (isPaused) {
            MediaSessionService.updatePlaybackState(false).catch(console.error);
        } else if (!isPlaying && !isPaused) {
            // Stopped completely
            MediaSessionService.destroy().catch(console.error);
        }
    }, [isPlaying, isPaused]);


    // Updates
    useEffect(() => {
        if (!playbackStrategyRef.current) return;

        playbackStrategyRef.current.setEventHandlers({
            onPlay: () => { },
            onPause: () => { },
            onChunkComplete: () => {
                if (currentChunkIndex + 1 < chunks.length) {
                    setTTSState({ currentChunkIndex: currentChunkIndex + 1 });
                } else {
                    setTTSState({ isPlaying: false });
                    // TODO: Next Chapter Logic
                }
            },
        });

        // Also inject the smart-scrubbing methods into the context 
        // Logic: We can't easily "set" methods on the context from here without a setContextActions method.
        // BUT, we passed `setTTSState` which updates state. 
        // Wait, `TTSContext` actions (play, pause) are defined at the Provider level, but `playChunk` logic 
        // is seemingly disconnected? 
        // Ah, `GlobalAudioPlayer` or `PersistentTTSPlayer` *consumes* state but doesn't easily *provide* methods up 
        // unless we put them in a Ref or Mutable Context.

        // Actually, looking at `PersistentTTSPlayer` in the file view...
        // It consumes `useTTS`. It doesn't seem to have a way to override `playChunk` in the Context.
        // Wait, how does `playChunk` in Context work? 
        // In `TTSContext.tsx`: `const playChunk = useCallback(...)` - it just sets `currentChunkIndex`.
        // The Player listens to `currentChunkIndex` changes.

        // So for `checkAudioAvailability`, we need a way for `useReaderTTS` (UI) to ask the Player/Queue.
        // Since `PersistentTTSPlayer` is a child of `TTSProvider`, we can't easily hoist functions.
        // UNLESS we add a `setCapabilities` or similar to the Context.

        // Let's modify `TTSContext` to allow registering these callbacks.
    }, [currentChunkIndex, chunks.length, setTTSState]);


    // 4. Update Global Progress
    useEffect(() => {
        const progress = chunks.length > 0
            ? Math.round(((currentChunkIndex + 1) / chunks.length) * 100)
            : 0;
        setTTSState({
            progressPercentage: progress,
            downloadProgress: downloadProgress
        });
    }, [currentChunkIndex, chunks.length, downloadProgress, setTTSState]);

    // Register capabilities with Context
    useEffect(() => {
        registerCapabilities({
            checkAudioAvailability,
            prioritizeChunk
        });
    }, [registerCapabilities, checkAudioAvailability, prioritizeChunk]);

    return null; // Headless
};
