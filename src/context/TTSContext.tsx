
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { MediaSessionService } from '../services/media/MediaSessionService';

export interface TTSState {
    isPlaying: boolean;
    isPaused: boolean;
    isLoading: boolean;
    playbackRate: number;
    currentBookId: string | null;
    currentBookTitle: string | null; // Store book title for display
    currentBookAuthor: string | null; // Store book author for display
    currentChapterId: string | null; // href or id
    currentChapterTitle: string | null; // Store chapter title for display
    currentChunkIndex: number;
    progressPercentage: number;
    downloadProgress: number; // Percentage of chunks downloaded (0-100)
    isBuffering: boolean; // Indicates if player is waiting for data
}

export interface TTSContextValue extends TTSState {
    // Actions
    play: () => void;
    pause: () => void;
    stop: () => void;
    setPlaybackRate: (rate: number) => void;
    seekToChunk: (index: number) => void;
    skipForward: () => void;
    skipBackward: () => void;

    // State Setters (used by GlobalAudioPlayer)
    setTTSState: (state: Partial<TTSState>) => void;

    // Methods to load a book into the global player
    loadBook: (bookId: string, bookTitle: string, bookAuthor: string, chapterTitle: string, initialChapterId?: string, initialChunkIndex?: number) => Promise<void>;

    // Register Player Capabilities (Dependency Injection)
    registerCapabilities: (caps: {
        checkAudioAvailability: (index: number) => Promise<boolean>,
        prioritizeChunk: (index: number) => void
    }) => void;

    // Direct access for consumers
    checkAudioAvailability: (index: number) => Promise<boolean>;
    prioritizeChunk: (index: number) => void;
}

const defaultState: TTSState = {
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    isBuffering: false,
    playbackRate: 1.0,
    currentBookId: null,
    currentBookTitle: null,
    currentBookAuthor: null,
    currentChapterId: null,
    currentChapterTitle: null,
    currentChunkIndex: 0,
    progressPercentage: 0,
    downloadProgress: 0
};

const TTSContext = createContext<TTSContextValue | undefined>(undefined);

export const useTTS = (): TTSContextValue => {
    const context = useContext(TTSContext);
    if (context === undefined) {
        throw new Error('useTTS must be used within a TTSProvider');
    }
    return context;
};

interface TTSProviderProps {
    children: ReactNode;
}

const TTS_STATE_KEY = 'yoread_tts_state';

const getInitialState = (): TTSState => {
    try {
        const saved = localStorage.getItem(TTS_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Always start paused/stopped on reload
            return {
                ...defaultState,
                ...parsed,
                isPlaying: false,
                isPaused: !!parsed.currentBookId, // Set paused if we have a book, so player shows
                isLoading: false,
                isBuffering: false
            };
        }
    } catch (e) {
        console.error('Failed to load TTS state:', e);
    }
    return defaultState;
};

export const TTSProvider: React.FC<TTSProviderProps> = ({ children }) => {
    const [state, setState] = useState<TTSState>(getInitialState);

    // Dynamic Capabilities (Injected by Player)
    const capabilitiesRef = React.useRef<{
        checkAudioAvailability: (index: number) => Promise<boolean>;
        prioritizeChunk: (index: number) => void;
    }>({
        checkAudioAvailability: async () => true, // Default: Assume yes if no player
        prioritizeChunk: () => { }
    });

    // Persist state changes
    React.useEffect(() => {
        const stateToSave = {
            currentBookId: state.currentBookId,
            currentBookTitle: state.currentBookTitle,
            currentBookAuthor: state.currentBookAuthor,
            currentChapterId: state.currentChapterId,
            currentChapterTitle: state.currentChapterTitle,
            currentChunkIndex: state.currentChunkIndex,
            progressPercentage: state.progressPercentage,
            downloadProgress: state.downloadProgress,
            playbackRate: state.playbackRate
        };
        localStorage.setItem(TTS_STATE_KEY, JSON.stringify(stateToSave));
    }, [
        state.currentBookId,
        state.currentBookTitle,
        state.currentBookAuthor,
        state.currentChapterId,
        state.currentChapterTitle,
        state.currentChunkIndex,
        state.progressPercentage,
        state.downloadProgress,
        state.playbackRate
    ]);

    // Computed / Actions (Placeholders for now, will be connected to GlobalAudioPlayer logic later)

    // Helper to update specific state parts
    const setTTSState = useCallback((updates: Partial<TTSState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Actions (to be implemented/connected to player)
    const play = useCallback(() => {
        setTTSState({ isPlaying: true, isPaused: false });
        MediaSessionService.updatePlaybackState(true).catch(console.error);
    }, [setTTSState]);

    const pause = useCallback(() => {
        setTTSState({ isPlaying: false, isPaused: true });
        MediaSessionService.updatePlaybackState(false).catch(console.error);
    }, [setTTSState]);

    const stop = useCallback(() => {
        setTTSState({ isPlaying: false, isPaused: false, isBuffering: false, currentBookId: null });
        MediaSessionService.destroy().catch(console.error);
    }, [setTTSState]);
    const setPlaybackRate = useCallback((rate: number) => setTTSState({ playbackRate: rate }), [setTTSState]);

    const seekToChunk = useCallback((index: number) => {
        // Trigger seek event or update state
        setTTSState({ currentChunkIndex: index });
    }, [setTTSState]);

    const skipForward = useCallback(() => { }, []); // Implement later
    const skipBackward = useCallback(() => { }, []); // Implement later

    const loadBook = useCallback(async (
        bookId: string,
        bookTitle: string,
        bookAuthor: string,
        chapterTitle: string,
        initialChapterId?: string,
        initialChunkIndex?: number
    ) => {
        setTTSState({
            isLoading: true,
            currentBookId: bookId,
            currentBookTitle: bookTitle,
            currentBookAuthor: bookAuthor,
            currentChapterTitle: chapterTitle,
            currentChapterId: initialChapterId || null,
            currentChunkIndex: initialChunkIndex || 0
        });

        // Initialize media session for lock screen controls
        await MediaSessionService.initialize({
            bookTitle,
            bookAuthor,
            chapterTitle,
            coverUrl: undefined // Will be set by GlobalAudioPlayer if available
        }, false);

        // Enable listening for lock screen control events
        await MediaSessionService.listen();

        // GlobalPlayer will react to this state change and start loading
    }, [setTTSState]);

    const registerCapabilities = useCallback((caps: {
        checkAudioAvailability: (index: number) => Promise<boolean>,
        prioritizeChunk: (index: number) => void
    }) => {
        capabilitiesRef.current = caps;
    }, []);

    const checkAudioAvailability = useCallback((index: number) => capabilitiesRef.current.checkAudioAvailability(index), []);
    const prioritizeChunk = useCallback((index: number) => capabilitiesRef.current.prioritizeChunk(index), []);

    // Subscribe to lock screen control events
    React.useEffect(() => {
        const cleanup = MediaSessionService.subscribe({
            onPlay: () => {
                console.log('[TTSContext] Lock screen play triggered');
                play();
            },
            onPause: () => {
                console.log('[TTSContext] Lock screen pause triggered');
                pause();
            },
            onStop: () => {
                console.log('[TTSContext] Lock screen stop triggered');
                stop();
            }
        });

        return cleanup;
    }, [play, pause, stop]);

    const value: TTSContextValue = {
        ...state,
        play,
        pause,
        stop,
        setPlaybackRate,
        seekToChunk,
        skipForward,
        skipBackward,
        setTTSState,
        loadBook,
        checkAudioAvailability,
        prioritizeChunk,
        registerCapabilities
    };

    return (
        <TTSContext.Provider value={value}>
            {children}
        </TTSContext.Provider>
    );
};
