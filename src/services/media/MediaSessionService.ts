import { CapacitorMusicControls } from 'capacitor-music-controls-plugin';
import { Capacitor } from '@capacitor/core';

/**
 * MediaSessionService
 * 
 * Manages lock screen and notification media controls for TTS playback.
 * Integrates with the native OS media session to show book info and playback controls.
 */

interface MediaMetadata {
    bookTitle: string;
    bookAuthor: string;
    chapterTitle: string;
    coverUrl?: string;
}

export class MediaSessionService {
    private static isInitialized = false;
    private static currentMetadata: MediaMetadata | null = null;

    /**
     * Initialize the media session with book and chapter information
     */
    static async initialize(metadata: MediaMetadata, isPlaying: boolean = false): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            console.log('[MediaSession] Not on native platform, skipping');
            return;
        }

        try {
            this.currentMetadata = metadata;

            await CapacitorMusicControls.create({
                track: metadata.chapterTitle || 'Chapter',
                artist: metadata.bookAuthor || 'Unknown Author',
                album: metadata.bookTitle,
                cover: metadata.coverUrl || 'assets/yologo.png', // Fallback to app logo
                isPlaying: isPlaying,
                dismissable: true,

                // Enable all controls
                hasPrev: false, // We don't have previous chapter navigation yet
                hasNext: false, // We don't have next chapter navigation yet
                hasClose: true,
                hasScrubbing: false, // No seek bar for now

                // Icons (Android uses these resource names)
                playIcon: 'media_play',
                pauseIcon: 'media_pause',
                closeIcon: 'media_close',

                // Notification channel (Android)
                notificationIcon: 'notification_icon'
            });

            this.isInitialized = true;
            console.log('[MediaSession] Initialized with:', metadata.bookTitle);
        } catch (error) {
            console.error('[MediaSession] Failed to initialize:', error);
        }
    }

    /**
     * Update playback state (play/pause)
     */
    static async updatePlaybackState(isPlaying: boolean): Promise<void> {
        if (!Capacitor.isNativePlatform() || !this.isInitialized) {
            return;
        }

        try {
            await CapacitorMusicControls.updateIsPlaying({ isPlaying });
            console.log('[MediaSession] Updated playback state:', isPlaying ? 'playing' : 'paused');
        } catch (error) {
            console.error('[MediaSession] Failed to update playback state:', error);
        }
    }

    /**
     * Update metadata (e.g., when chapter changes)
     */
    static async updateMetadata(metadata: Partial<MediaMetadata>): Promise<void> {
        if (!Capacitor.isNativePlatform() || !this.isInitialized) {
            return;
        }

        try {
            // Merge with current metadata
            this.currentMetadata = {
                ...this.currentMetadata!,
                ...metadata
            };

            // Recreate the session with new metadata
            // Note: Some plugins require recreation for metadata updates
            await this.destroy();
            await this.initialize(this.currentMetadata, true);

            console.log('[MediaSession] Updated metadata');
        } catch (error) {
            console.error('[MediaSession] Failed to update metadata:', error);
        }
    }

    /**
     * Destroy the media session (when playback stops)
     */
    static async destroy(): Promise<void> {
        if (!Capacitor.isNativePlatform() || !this.isInitialized) {
            return;
        }

        try {
            await CapacitorMusicControls.destroy();
            this.isInitialized = false;
            this.currentMetadata = null;
            console.log('[MediaSession] Destroyed');
        } catch (error) {
            console.error('[MediaSession] Failed to destroy:', error);
        }
    }

    /**
     * Subscribe to control events from lock screen/notification
     * Returns a cleanup function
     */
    static subscribe(callbacks: {
        onPlay?: () => void;
        onPause?: () => void;
        onStop?: () => void;
    }): () => void {
        if (!Capacitor.isNativePlatform()) {
            return () => { };
        }

        const listener = CapacitorMusicControls.addListener('controlsNotification', (info: any) => {
            console.log('[MediaSession] Control event:', info.message);

            switch (info.message) {
                case 'music-controls-play':
                    callbacks.onPlay?.();
                    break;
                case 'music-controls-pause':
                    callbacks.onPause?.();
                    break;
                case 'music-controls-destroy':
                case 'music-controls-headset-unplugged':
                    callbacks.onStop?.();
                    break;
                default:
                    console.log('[MediaSession] Unhandled control:', info.message);
            }
        });

        // Return cleanup function
        return () => {
            listener.remove();
        };
    }

    /**
     * Enable media controls (call after creating session)
     */
    static async listen(): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        try {
            await CapacitorMusicControls.listen();
            console.log('[MediaSession] Started listening for control events');
        } catch (error) {
            console.error('[MediaSession] Failed to start listening:', error);
        }
    }
}
