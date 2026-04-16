/**
 * Playback strategy interface
 * Allows different audio playback implementations (Web Audio API vs HTML5 Audio)
 */

import { TTSEventHandlers } from '../../../types/tts';

export interface IPlaybackStrategy {
  /**
   * Play audio from URL or buffer
   */
  play(source: string | Blob, chunkIndex: number): Promise<void>;

  /**
   * Pause playback
   */
  pause(): void;

  /**
   * Resume playback
   */
  resume(): Promise<void>;

  /**
   * Stop playback
   */
  stop(): void;

  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void;

  /**
   * Get current playback time
   */
  getCurrentTime(): number;

  /**
   * Get duration
   */
  getDuration(): number;

  /**
   * Check if playing
   */
  isPlaying(): boolean;

  /**
   * Check if paused
   */
  isPaused(): boolean;

  /**
   * Get current chunk index
   */
  getCurrentChunkIndex(): number | null;

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: TTSEventHandlers): void;

  /**
   * Pre-decode/prepare chunk for seamless playback
   */
  prepareChunk(chunkIndex: number, audioBlob: Blob): Promise<void>;

  /**
   * Update media metadata for the strategy (e.g. for Media Session API)
   */
  setMetadata(metadata: { title: string; author: string; coverUrl?: string }): void;

  /**
   * Cleanup resources
   */
  cleanup(): void;
}

