
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

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
}

const defaultState: TTSState = {
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    playbackRate: 1.0,
    currentBookId: null,
    currentBookTitle: null,
    currentBookAuthor: null,
    currentChapterId: null,
    currentChapterTitle: null,
    currentChunkIndex: 0,
    progressPercentage: 0
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
                isLoading: false
            };
        }
    } catch (e) {
        console.error('Failed to load TTS state:', e);
    }
    return defaultState;
};

export const TTSProvider: React.FC<TTSProviderProps> = ({ children }) => {
    const [state, setState] = useState<TTSState>(getInitialState);

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
        state.playbackRate
    ]);

    // Computed / Actions (Placeholders for now, will be connected to GlobalAudioPlayer logic later)

    // Helper to update specific state parts
    const setTTSState = useCallback((updates: Partial<TTSState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Actions (to be implemented/connected to player)
    const play = useCallback(() => setTTSState({ isPlaying: true, isPaused: false }), [setTTSState]);
    const pause = useCallback(() => setTTSState({ isPlaying: false, isPaused: true }), [setTTSState]);
    const stop = useCallback(() => setTTSState({ isPlaying: false, isPaused: false, currentBookId: null }), [setTTSState]);
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
        // GlobalPlayer will react to this state change and start loading
    }, [setTTSState]);

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
        loadBook
    };

    return (
        <TTSContext.Provider value={value}>
            {children}
        </TTSContext.Provider>
    );
};
