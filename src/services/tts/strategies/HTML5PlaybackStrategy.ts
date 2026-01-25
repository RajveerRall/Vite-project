/**
 * HTML5 Audio playback strategy (fallback)
 * Uses HTMLAudioElement for browsers without Web Audio API support
 */

import { IPlaybackStrategy } from './IPlaybackStrategy';
import { TTSEventHandlers } from '../../../types/tts';
import { TTSErrorHandler } from '../TTSErrorHandler';
import { MediaSessionService } from '../MediaSessionService';

export class HTML5PlaybackStrategy implements IPlaybackStrategy {
  private audioElement: HTMLAudioElement | null = null;
  private currentChunkIndex: number | null = null;
  private playbackRate: number = 1.0;
  private eventHandlers: TTSEventHandlers = {};
  private instanceId: string;
  private metadata: { title: string; author: string; coverUrl?: string } | null = null;

  constructor(instanceId?: string) {
    this.instanceId = instanceId || `HTML5_${Date.now()}`;
  }

  async play(source: string | Blob, chunkIndex: number): Promise<void> {
    // Clean up previous audio element
    this.cleanupAudio();

    // Create new audio element
    this.audioElement = new Audio();
    this.audioElement.playbackRate = this.playbackRate;

    // Handle Blob or URL
    if (source instanceof Blob) {
      const url = URL.createObjectURL(source);
      this.audioElement.src = url;
    } else {
      this.audioElement.src = source;
    }

    // Set up event handlers
    this.setupEventHandlers(chunkIndex);

    // Start playback
    try {
      await this.audioElement.play();
      this.currentChunkIndex = chunkIndex;
      this.eventHandlers.onPlay?.(chunkIndex);

      // Update Media Session state
      MediaSessionService.setPlaybackState('playing');
    } catch (error) {
      const ttsError = TTSErrorHandler.handleAudioError(error);
      this.eventHandlers.onError?.(ttsError);
      throw ttsError;
    }
  }

  private setupEventHandlers(chunkIndex: number): void {
    if (!this.audioElement) return;

    const handleEnded = () => {
      this.eventHandlers.onChunkComplete?.(chunkIndex);
    };

    const handleError = (e: Event) => {
      const error = TTSErrorHandler.handleAudioError(e);
      this.eventHandlers.onError?.(error);
    };

    const handlePause = () => {
      this.eventHandlers.onPause?.(chunkIndex);
    };

    this.audioElement.addEventListener('ended', handleEnded);
    this.audioElement.addEventListener('error', handleError);
    this.audioElement.addEventListener('pause', handlePause);

    // Store for cleanup
    (this.audioElement as any)._handlers = { handleEnded, handleError, handlePause };
  }

  pause(): void {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      MediaSessionService.setPlaybackState('paused');
    }
  }

  async resume(): Promise<void> {
    if (!this.audioElement) {
      throw TTSErrorHandler.handleAudioError(new Error('No audio element to resume'));
    }

    try {
      await this.audioElement.play();
      if (this.currentChunkIndex !== null) {
        this.eventHandlers.onResume?.(this.currentChunkIndex);
      }
    } catch (error) {
      throw TTSErrorHandler.handleAudioError(error);
    }
  }

  stop(): void {
    this.cleanupAudio();
    this.currentChunkIndex = null;
    this.eventHandlers.onStop?.();
    MediaSessionService.setPlaybackState('none');
  }

  setPlaybackRate(rate: number): void {
    // Clamp speed between 0.5x and 1.5x
    this.playbackRate = Math.max(0.5, Math.min(1.5, rate));
    if (this.audioElement) {
      this.audioElement.playbackRate = this.playbackRate;
    }
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  getDuration(): number {
    return this.audioElement?.duration || 0;
  }

  isPlaying(): boolean {
    return this.audioElement !== null && !this.audioElement.paused && !this.audioElement.ended;
  }

  isPaused(): boolean {
    return this.audioElement !== null && this.audioElement.paused && !this.audioElement.ended;
  }

  getCurrentChunkIndex(): number | null {
    return this.currentChunkIndex;
  }

  setEventHandlers(handlers: TTSEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  async prepareChunk(chunkIndex: number, audioBlob: Blob): Promise<void> {
    // In practice, blob URLs are created on-demand
  }

  setMetadata(metadata: { title: string; author: string; coverUrl?: string }): void {
    this.metadata = metadata;
    MediaSessionService.setMetadata({
      title: metadata.title,
      artist: metadata.author,
      artwork: metadata.coverUrl ? [{ src: metadata.coverUrl }] : undefined
    });
  }

  private cleanupAudio(): void {
    if (this.audioElement) {
      const handlers = (this.audioElement as any)?._handlers;
      if (handlers) {
        this.audioElement.removeEventListener('ended', handlers.handleEnded);
        this.audioElement.removeEventListener('error', handlers.handleError);
        this.audioElement.removeEventListener('pause', handlers.handlePause);
      }

      this.audioElement.pause();

      if (this.audioElement.src && this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
      }

      this.audioElement.src = '';
      this.audioElement = null;
    }
  }

  cleanup(): void {
    this.cleanupAudio();
  }
}

