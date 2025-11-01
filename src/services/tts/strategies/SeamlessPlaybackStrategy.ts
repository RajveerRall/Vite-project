/**
 * Seamless playback strategy using Web Audio API
 * Provides zero-gap playback between chunks
 */

import { IPlaybackStrategy } from './IPlaybackStrategy';
import { TTSEventHandlers } from '../../../types/tts';
import { createTTSSeamlessPlaybackService, TTSSeamlessPlaybackService } from '../TTSSeamlessPlaybackService';

export class SeamlessPlaybackStrategy implements IPlaybackStrategy {
  private service: TTSSeamlessPlaybackService;
  private currentChunkIndex: number | null = null;

  constructor(config?: { playbackRate?: number; instanceId?: string }) {
    this.service = createTTSSeamlessPlaybackService({
      playbackRate: config?.playbackRate || 1.0,
      instanceId: config?.instanceId,
    });
  }

  async play(source: string | Blob, chunkIndex: number): Promise<void> {
    if (typeof source === 'string') {
      throw new Error('SeamlessPlaybackStrategy requires Blob, not URL. Use prepareChunk first.');
    }

    this.currentChunkIndex = chunkIndex;
    await this.service.playChunk(chunkIndex);
  }

  pause(): void {
    this.service.pause();
  }

  async resume(): Promise<void> {
    await this.service.resume();
  }

  stop(): void {
    this.service.stop();
    this.currentChunkIndex = null;
  }

  setPlaybackRate(rate: number): void {
    this.service.setPlaybackRate(rate);
  }

  getCurrentTime(): number {
    return this.service.getCurrentTime();
  }

  getDuration(): number {
    return this.service.getDuration();
  }

  isPlaying(): boolean {
    return this.service.isCurrentlyPlaying();
  }

  isPaused(): boolean {
    return this.service.isCurrentlyPaused();
  }

  getCurrentChunkIndex(): number | null {
    return this.service.getCurrentChunkIndex() ?? this.currentChunkIndex;
  }

  setEventHandlers(handlers: TTSEventHandlers): void {
    this.service.setEventHandlers(handlers);
  }

  async prepareChunk(chunkIndex: number, audioBlob: Blob): Promise<void> {
    await this.service.enqueueChunk(chunkIndex, audioBlob);
  }

  cleanup(): void {
    this.service.cleanup();
  }

  /**
   * Get underlying service (for advanced use)
   */
  getService(): TTSSeamlessPlaybackService {
    return this.service;
  }
}

