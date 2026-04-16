/**
 * Service for managing audio element lifecycle and playback
 * Handles audio element creation, event management, and playback control
 */

import { IAudioPlayer, TTSEventHandlers } from '../../types/tts';
import { TTS_TIMING } from '../../constants/tts';
import { TTSErrorHandler } from './TTSErrorHandler';

export interface AudioPlayerConfig {
  playbackRate?: number;
  instanceId?: string;
}

export interface AudioPlayerHandlers {
  handlePlay?: () => void;
  handleEnded?: () => void;
  handleError?: (error: Event) => void;
  handlePause?: () => void;
}

export class TTSAudioPlayer implements IAudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private handlers: AudioPlayerHandlers | null = null;
  private playbackRate: number = 1;
  private instanceId: string;
  private isPlaybackActive: boolean = false;

  constructor(config?: AudioPlayerConfig) {
    this.playbackRate = config?.playbackRate || 1;
    this.instanceId = config?.instanceId || `AudioPlayer_${Date.now()}`;
  }

  /**
   * Clean up previous audio element
   */
  private cleanupPrevious(): void {
    if (this.audioElement) {
      // Remove event listeners
      if (this.handlers) {
        this.audioElement.removeEventListener('play', this.handlers.handlePlay!);
        this.audioElement.removeEventListener('ended', this.handlers.handleEnded!);
        this.audioElement.removeEventListener('error', this.handlers.handleError!);
        this.audioElement.removeEventListener('pause', this.handlers.handlePause!);
      }

      this.audioElement.pause();
      
      // Revoke blob URL if present
      if (this.audioElement.src && this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
      }

      this.audioElement.src = '';
      this.audioElement = null;
      this.handlers = null;
    }
  }

  /**
   * Play audio from URL
   */
  async play(url: string): Promise<void> {
    this.cleanupPrevious();

    // Create fresh audio element
    this.audioElement = new Audio();
    this.audioElement.playbackRate = this.playbackRate;

    // Set up event handlers BEFORE setting src (more reliable)
    this.setupEventHandlers();

    // Set src and start playback
    this.audioElement.src = url;

    console.log(
      `[${this.instanceId}] Setting up audio: ${url.substring(0, 50)}... playbackRate: ${this.playbackRate}x`
    );

    try {
      await this.audioElement.play();
      this.isPlaybackActive = true;
    } catch (error) {
      this.isPlaybackActive = false;
      const ttsError = TTSErrorHandler.handleAudioError(error);
      this.handlers?.handleError?.(ttsError as any);
      throw ttsError;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.audioElement) return;

    const handlePlay = () => {
      this.isPlaybackActive = true;
      this.handlers?.handlePlay?.();
    };

    const handleEnded = () => {
      this.isPlaybackActive = false;
      this.handlers?.handleEnded?.();
    };

    const handleError = (e: Event) => {
      this.isPlaybackActive = false;
      this.handlers?.handleError?.(e);
    };

    const handlePause = () => {
      this.isPlaybackActive = false;
      this.handlers?.handlePause?.();
    };

    this.handlers = { handlePlay, handleEnded, handleError, handlePause };

    // Attach event listeners
    this.audioElement.addEventListener('play', handlePlay);
    this.audioElement.addEventListener('ended', handleEnded);
    this.audioElement.addEventListener('error', handleError);
    this.audioElement.addEventListener('pause', handlePause);

    // Store handlers on element for cleanup reference
    (this.audioElement as any)._handlers = this.handlers;
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audioElement && this.isPlaybackActive) {
      this.audioElement.pause();
      this.isPlaybackActive = false;
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (!this.audioElement) {
      throw TTSErrorHandler.handleAudioError(
        new Error('No audio element to resume')
      );
    }

    try {
      await this.audioElement.play();
      this.isPlaybackActive = true;
    } catch (error) {
      this.isPlaybackActive = false;
      throw TTSErrorHandler.handleAudioError(error);
    }
  }

  /**
   * Stop playback and cleanup
   */
  stop(): void {
    this.pause();
    this.cleanupPrevious();
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void {
    // Clamp speed between 0.5x and 1.5x
    this.playbackRate = Math.max(0.5, Math.min(1.5, rate));
    if (this.audioElement) {
      this.audioElement.playbackRate = this.playbackRate;
      console.log(`[${this.instanceId}] Changed playback rate to ${this.playbackRate}x`);
    }
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  /**
   * Get audio duration
   */
  getDuration(): number {
    return this.audioElement?.duration || 0;
  }

  /**
   * Check if playing
   */
  isPlaying(): boolean {
    return this.isPlaybackActive && 
           this.audioElement !== null && 
           !this.audioElement.paused;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.audioElement !== null && 
           this.audioElement.paused &&
           !this.audioElement.ended;
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: AudioPlayerHandlers): void {
    this.handlers = handlers;
  }

  /**
   * Get audio element (for advanced use cases)
   */
  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement;
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.stop();
  }
}

/**
 * Factory function to create audio player
 */
export function createTTSAudioPlayer(config?: AudioPlayerConfig): TTSAudioPlayer {
  return new TTSAudioPlayer(config);
}

