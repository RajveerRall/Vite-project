/**
 * Media Session Service
 * Handles interaction with navigator.mediaSession to provide background audio support
 * and lock screen controls.
 */

export interface MediaMetadata {
    title: string;
    artist: string;
    album?: string;
    artwork?: { src: string; sizes?: string; type?: string }[];
}

export interface MediaSessionActions {
    play?: () => void;
    pause?: () => void;
    stop?: () => void;
    seekbackward?: (details: MediaSessionActionDetails) => void;
    seekforward?: (details: MediaSessionActionDetails) => void;
    previoustrack?: () => void;
    nexttrack?: () => void;
}

export class MediaSessionService {
    /**
     * Update the media session metadata
     */
    static setMetadata(metadata: MediaMetadata): void {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = new window.MediaMetadata({
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album || 'YoRead',
            artwork: metadata.artwork || [
                { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            ],
        });

        console.log('[MediaSession] Metadata updated:', metadata.title);
    }

    /**
     * Set playback state
     */
    static setPlaybackState(state: 'playing' | 'paused' | 'none'): void {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = state;
    }

    /**
     * Set action handlers for media controls
     */
    static setActionHandlers(actions: MediaSessionActions): void {
        if (!('mediaSession' in navigator)) return;

        const actionTypes: MediaSessionAction[] = [
            'play',
            'pause',
            'stop',
            'seekbackward',
            'seekforward',
            'previoustrack',
            'nexttrack',
        ];

        actionTypes.forEach((action) => {
            const handler = actions[action as keyof MediaSessionActions];
            if (handler) {
                navigator.mediaSession.setActionHandler(action, handler as MediaSessionActionHandler);
            } else {
                navigator.mediaSession.setActionHandler(action, null);
            }
        });
    }

    /**
     * Update position state for the progress bar on lock screen
     */
    static setPositionState(state: { duration: number; playbackRate: number; position: number }): void {
        if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;

        try {
            // Validate inputs to avoid errors if values are NaN or infinity
            if (isFinite(state.duration) && isFinite(state.position) && isFinite(state.playbackRate)) {
                navigator.mediaSession.setPositionState({
                    duration: Math.max(0, state.duration),
                    playbackRate: state.playbackRate,
                    position: Math.max(0, Math.min(state.position, state.duration)),
                });
            }
        } catch (error) {
            console.warn('[MediaSession] Failed to set position state:', error);
        }
    }
}
