
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTTS } from '../../context/TTSContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LocalBookRepository } from '../../services/books/repository/LocalBookRepository';
import { EpubParserService, EpubStructure } from '../../services/books/EpubParserService';
import { BookContentService } from '../../services/books/BookContentService';
import { useTTSChunking } from '../../hooks/tts/useTTSChunking';
import { useTTSBuffering } from '../../hooks/tts/useTTSBuffering';
import { createAdaptivePlaybackStrategy } from '../../services/tts/strategies/AdaptivePlaybackStrategy';
import { IPlaybackStrategy } from '../../services/tts/strategies/IPlaybackStrategy';

export const GlobalAudioPlayer: React.FC = () => {
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
    } = useTTS();

    const { addToast } = useToast();
    const { user } = useAuth();

    // State
    const [structure, setStructure] = useState<EpubStructure | null>(null);
    const [currentText, setCurrentText] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Instances
    const playerInstanceId = useRef(`GlobalPlayer_${Date.now()}`).current;
    const previousChapterIdRef = useRef<string | null>(null);

    // Playback Strategy
    const playbackStrategyRef = useRef<IPlaybackStrategy | null>(null);
    const lastPlayedChunkRef = useRef<number | null>(null);
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

    // 2. Buffering (Reusing existing hook)
    const {
        prefetchChunks,
        fetchSingleChunk,
        audioBuffer,
        clearAudioBuffer,
        getBlob // Exposed from our updated hook
    } = useTTSBuffering({
        chunks,
        selectedVoice: 'en-US-BrianMultilingualNeural', // TODO: Get from settings
        ttsSpeed: playbackRate,
        playbackStrategyRef,
    });

    // --- Effects ---

    // 1. Load Book Structure (Spine/TOC) when book changes
    useEffect(() => {
        // IMMEDIATE RESET: Wipe old book data from memory when ID changes
        setStructure(null);
        setCurrentText('');
        clearAudioBuffer(); // Clear audio buffers
        if (playbackStrategyRef.current) {
            try { playbackStrategyRef.current.stop(); } catch (e) { console.warn('Error stopping strategy:', e); }
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

                // Extract and store book metadata from EPUB structure if not already provided
                if (!currentBookTitle || !currentBookAuthor) {
                    setTTSState({
                        currentBookTitle: currentBookTitle || struct.metadata.title || null,
                        currentBookAuthor: currentBookAuthor || struct.metadata.author || null
                    });
                }

                setError(null);
            } catch (e) {
                console.error('[GlobalPlayer] Error loading book:', e);
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
            // Also update metadata to none or default
            if (playbackStrategyRef.current) {
                playbackStrategyRef.current.setMetadata({ title: 'YoRead', author: 'Ebook Reader' });
            }
        }
    }, [currentBookId, user?.id]);
    // Track last seen state to detect transitions
    const lastChapterIdRef = useRef<string | null>(currentChapterId);
    const lastChunkIndexRef = useRef<number>(currentChunkIndex);

    // 2. Load Chapter Content when Chapter ID or Loading state changes
    useEffect(() => {
        const loadChapter = async () => {
            if (!structure || !currentChapterId || !isLoading) {
                // Keep refs in sync even when not loading
                lastChapterIdRef.current = currentChapterId;
                lastChunkIndexRef.current = currentChunkIndex;
                return;
            }

            // Detect if this is a "Natural Navigation" (Page turn) vs "Explicit Jump" (Selection/Seek)
            const chapterChanged = lastChapterIdRef.current !== currentChapterId;
            const chunkChanged = lastChunkIndexRef.current !== currentChunkIndex;

            // If chapter changed but chunk index is still pointing to what it was on the previous page,
            // it's a natural carry-over from EPub navigation. Reset it to 0.
            if (chapterChanged && !chunkChanged) {
                console.log(`[GlobalPlayer] Natural transition from ${lastChapterIdRef.current} to ${currentChapterId}. Resetting index to 0.`);
                setTTSState({ currentChunkIndex: 0 });
            } else if (chapterChanged && chunkChanged) {
                console.log(`[GlobalPlayer] Explicit jump to ${currentChapterId} at chunk ${currentChunkIndex}.`);
            }

            // Sync refs immediately
            lastChapterIdRef.current = currentChapterId;
            lastChunkIndexRef.current = currentChunkIndex;

            // SAME CHAPTER SHORT-CIRCUIT
            // If we are already on this chapter and text is loaded, just clear loading flag
            if (previousChapterIdRef.current === currentChapterId && currentText) {
                console.log('[GlobalPlayer] Chapter already loaded, finalizing start');
                setTTSState({ isLoading: false });
                return;
            }

            try {
                // Stop playback and clear buffers
                if (playbackStrategyRef.current) {
                    try { playbackStrategyRef.current.stop(); } catch (e) { }
                }
                clearAudioBuffer();
                setCurrentText('');

                previousChapterIdRef.current = currentChapterId;

                // Match chapter to spine
                const spineItem = structure.spine.find(href => href.includes(currentChapterId) || currentChapterId.includes(href));
                const targetHref = spineItem || currentChapterId;

                if (!targetHref) {
                    console.warn('[GlobalPlayer] Could not find spine item for chapter:', currentChapterId);
                    setTTSState({ isLoading: false });
                    return;
                }

                const { text } = await BookContentService.loadPage(structure.zip, targetHref);
                setCurrentText(text); // Triggers chunking
                setTTSState({ isLoading: false }); // Done!

                // Metadata update
                if (playbackStrategyRef.current) {
                    playbackStrategyRef.current.setMetadata({
                        title: currentBookTitle || 'Untitled Book',
                        author: currentBookAuthor || 'Unknown Author'
                    });
                }
            } catch (e) {
                console.error('[GlobalPlayer] Error loading chapter:', e);
                setTTSState({ isLoading: false });
            }
        };

        loadChapter();
    }, [currentChapterId, structure, clearAudioBuffer, isLoading]); // Only react to these

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
            let source: string | Blob | undefined;

            if (isSeamless) {
                // Get blob from buffering hook
                source = getBlob(index) || undefined;
            } else {
                // Get URL from audio buffer
                source = audioBuffer.current[index];
            }

            // If source is missing, fetch it and wait for completion
            if (!source) {
                console.log(`[GlobalPlayer] Source missing for chunk ${index}, fetching...`);
                await fetchSingleChunk(index);

                // Now get the source - it should be ready
                if (isSeamless) {
                    source = getBlob(index) || undefined;
                } else {
                    source = audioBuffer.current[index];
                }

                // SECOND CHANCE: If still missing, wait briefly and try one more time
                // This covers cases where state updates might be slightly delayed
                if (!source) {
                    console.log(`[GlobalPlayer] Source still missing for chunk ${index} after fetch, waiting 500ms...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    source = (isSeamless ? getBlob(index) : audioBuffer.current[index]) || undefined;
                }
            } else if (isSeamless) {
                // ✅ FIX: Even if we have the source blob in useTTSBuffering, 
                // we MUST ensure it's enqueued and decoded in the playback strategy.
                await strategy.prepareChunk(index, source as Blob);
            }

            if (!source) {
                console.error(`[GlobalPlayer] CRITICAL: Failed to load source for chunk ${index}. Buffering failed or was cancelled.`);
                // Optionally signal an error state to the UI here
                return;
            }

            // Play
            await strategy.play(source, index);

            // Prefetch next few chunks
            prefetchChunks(index + 1);

        } catch (e) {
            console.error('[GlobalPlayer] Playback error:', e);
            // Auto-pause on error?
        }
    }, [chunks, setTTSState, fetchSingleChunk, prefetchChunks, audioBuffer, getBlob]);


    const lastContextIndexRef = useRef<number>(currentChunkIndex);

    // 3. Playback Control - Unified effect
    useEffect(() => {
        const strategy = playbackStrategyRef.current;
        if (!strategy) return;

        // Update tracking ref whenever context index changes
        // We do this AFTER the playback effect logic check below

        // Prevent playback if loading new content
        if (isLoading) {
            lastContextIndexRef.current = currentChunkIndex; // Keep sync even during loading
            return;
        }

        if (isPlaying && !isPaused && chunks.length > 0) {
            // Only play if:
            // 1. Strategy is not currently playing, OR
            // 2. Strategy is playing but on the wrong chunk
            const strategyChunkIndex = strategy.getCurrentChunkIndex();
            const isPlayingWrongChunk = strategyChunkIndex !== null && strategyChunkIndex !== currentChunkIndex;
            const isNotPlaying = !strategy.isPlaying();

            // Prevent duplicate calls for the same chunk
            const isDuplicateCall = lastPlayedChunkRef.current === currentChunkIndex && strategy.isPlaying();

            if ((isNotPlaying || isPlayingWrongChunk) && !isDuplicateCall) {
                console.log(`[GlobalPlayer] Navigation/Start: chunk ${currentChunkIndex}. Strategy state: ${isNotPlaying ? 'stopped' : `on chunk ${strategyChunkIndex}`}`);
                lastPlayedChunkRef.current = currentChunkIndex;
                playChunk(currentChunkIndex);
            }
        } else {
            if (strategy.isPlaying()) {
                console.log(`[GlobalPlayer] Stopping playback as state is not active`);
                strategy.pause();
            }
            // Reset when stopped
            if (!isPlaying && !isPaused) {
                lastPlayedChunkRef.current = null;
            }
        }

        // Update tracking ref
        lastContextIndexRef.current = currentChunkIndex;
    }, [isPlaying, isPaused, isLoading, chunks, currentChunkIndex, playChunk]);


    // Updates
    // Listen to Strategy events (timeupdate, ended) to update Context currentChunkIndex
    useEffect(() => {
        if (!playbackStrategyRef.current) return;

        playbackStrategyRef.current.setEventHandlers({
            onPlay: () => {
                // setTTSState({ isPlaying: true }); // Already set
            },
            onPause: () => {
                // setTTSState({ isPlaying: false }); // Handled by context action
            },
            onChunkComplete: () => {
                // Move to next chunk
                if (currentChunkIndex + 1 < chunks.length) {
                    setTTSState({ currentChunkIndex: currentChunkIndex + 1 });
                } else {
                    // End of chapter
                    setTTSState({ isPlaying: false });
                    // TODO: Move to next chapter logic
                }
            },
        });
    }, [currentChunkIndex, chunks.length, setTTSState]);


    return null; // Headless
};
