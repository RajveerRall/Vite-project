
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
        currentChunkIndex,
        selectedVoice: 'en-US-BrianMultilingualNeural', // TODO: Get from settings
        ttsSpeed: playbackRate,
        playbackStrategyRef,
        readerInstanceId: playerInstanceId
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

    // 2. Load Chapter Content when Chapter ID changes
    useEffect(() => {
        const loadChapter = async () => {
            if (!structure || !currentChapterId) return;

            try {
                // Stop playback and clear buffers when chapter changes
                const strategy = playbackStrategyRef.current;
                if (strategy) {
                    try {
                        strategy.stop();
                    } catch (e) {
                        console.warn('[GlobalPlayer] Error stopping playback:', e);
                    }
                }

                // Clear audio buffers
                clearAudioBuffer();

                // Clear current text immediately to prevent stale chunks from being played
                setCurrentText('');

                // Find file path for chapter ID (href)

                // Track previous chapter to prevent resetting chunk index on reload restoration
                // If previous matches current (or is null on first run), we preserve the restored index
                if (previousChapterIdRef.current !== null && previousChapterIdRef.current !== currentChapterId) {
                    setTTSState({ currentChunkIndex: 0 });
                }
                previousChapterIdRef.current = currentChapterId;
                // Logic to match chapterId (which might be TOC ID) to Spine Href needs to be robust.
                const spineItem = structure.spine.find(href => href.includes(currentChapterId) || currentChapterId.includes(href));
                const targetHref = spineItem || currentChapterId; // Fallback

                if (!targetHref) {
                    console.warn('[GlobalPlayer] Could not find spine item for chapter:', currentChapterId);
                    return;
                }

                const { text } = await BookContentService.loadPage(structure.zip, targetHref);
                setCurrentText(text); // Triggers chunking
                setTTSState({ isLoading: false }); // Done loading chapter

                // NEW: Update Media Session Metadata
                if (playbackStrategyRef.current) {
                    playbackStrategyRef.current.setMetadata({
                        title: currentBookTitle || 'Untitled Book',
                        author: currentBookAuthor || 'Unknown Author'
                        // TODO: Pass coverUrl if available in the future
                    });
                }
            } catch (e) {
                console.error('[GlobalPlayer] Error loading chapter:', e);
            }
        };

        loadChapter();
    }, [currentChapterId, structure, clearAudioBuffer]);

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
                // fetchSingleChunk already awaits the full fetch + preparation cycle
                await fetchSingleChunk(index);

                // Now get the source - it should be ready
                if (isSeamless) {
                    source = getBlob(index) || undefined;
                } else {
                    source = audioBuffer.current[index];
                }
            }

            if (!source) {
                console.error(`[GlobalPlayer] Failed to load source for chunk ${index} - source not available after fetch`);
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


    // 3. Playback Control
    useEffect(() => {
        const strategy = playbackStrategyRef.current;
        if (!strategy) return;

        // Prevent playback if loading new content
        if (isLoading) return;

        if (isPlaying && !isPaused && chunks.length > 0) {
            // Start playback if not playing
            if (!strategy.isPlaying()) {
                playChunk(currentChunkIndex);
            }
        } else {
            if (strategy.isPlaying()) {
                strategy.pause();
            }
        }
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

    // React to chunk index change (auto-play next)
    useEffect(() => {
        // Prevent seeking/playback if loading
        if (isLoading) return;

        if (isPlaying && !isPaused && chunks.length > 0) {
            const strategy = playbackStrategyRef.current;
            // If index changed and we are not playing correct chunk, play it
            if (strategy && strategy.getCurrentChunkIndex() !== currentChunkIndex) {
                playChunk(currentChunkIndex);
            }
        }
    }, [currentChunkIndex, isPlaying, isPaused, isLoading, chunks, playChunk]);


    return null; // Headless
};
