/**
 * Adaptive playback strategy
 * Automatically selects best available playback method:
 * - Web Audio API (seamless) if available
 * - HTML5 Audio (fallback) otherwise
 */

import { IPlaybackStrategy } from './IPlaybackStrategy';
import { SeamlessPlaybackStrategy } from './SeamlessPlaybackStrategy';
import { HTML5PlaybackStrategy } from './HTML5PlaybackStrategy';
import { TTSEventHandlers } from '../../../types/tts';

export interface AdaptiveStrategyConfig {
  playbackRate?: number;
  instanceId?: string;
  forceStrategy?: 'seamless' | 'html5' | 'auto';
}

export class AdaptivePlaybackStrategy implements IPlaybackStrategy {
  private strategy: IPlaybackStrategy;
  private strategyType: 'seamless' | 'html5';
  private config: AdaptiveStrategyConfig;

  constructor(config?: AdaptiveStrategyConfig) {
    this.config = config || {};
    this.strategy = this.selectStrategy();
    this.strategyType = this.determineStrategyType();
    
    console.log(`[AdaptiveStrategy] Selected: ${this.strategyType} playback`);
  }

  /**
   * Select best available playback strategy
   */
  private selectStrategy(): IPlaybackStrategy {
    const forceStrategy = this.config.forceStrategy;

    if (forceStrategy === 'html5') {
      return new HTML5PlaybackStrategy(this.config.instanceId);
    }

    if (forceStrategy === 'seamless') {
      if (!this.supportsWebAudio()) {
        console.warn('[AdaptiveStrategy] Web Audio API not supported, falling back to HTML5');
        return new HTML5PlaybackStrategy(this.config.instanceId);
      }
      return new SeamlessPlaybackStrategy({
        playbackRate: this.config.playbackRate,
        instanceId: this.config.instanceId,
      });
    }

    // Auto-detect
    if (this.supportsWebAudio()) {
      try {
        return new SeamlessPlaybackStrategy({
          playbackRate: this.config.playbackRate,
          instanceId: this.config.instanceId,
        });
      } catch (error) {
        console.warn('[AdaptiveStrategy] Failed to initialize Web Audio API, using HTML5 fallback:', error);
        return new HTML5PlaybackStrategy(this.config.instanceId);
      }
    }

    return new HTML5PlaybackStrategy(this.config.instanceId);
  }

  /**
   * Determine strategy type
   */
  private determineStrategyType(): 'seamless' | 'html5' {
    return this.strategy instanceof SeamlessPlaybackStrategy ? 'seamless' : 'html5';
  }

  /**
   * Check if Web Audio API is supported
   */
  private supportsWebAudio(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Get current strategy type
   */
  getStrategyType(): 'seamless' | 'html5' {
    return this.strategyType;
  }

  /**
   * Switch strategy at runtime (if needed)
   */
  switchStrategy(type: 'seamless' | 'html5'): void {
    if (type === this.strategyType) return;

    const wasPlaying = this.strategy.isPlaying();
    const currentTime = this.strategy.getCurrentTime();
    const currentChunk = this.strategy.getCurrentChunkIndex();

    this.strategy.stop();
    this.strategy.cleanup();

    if (type === 'seamless') {
      this.strategy = new SeamlessPlaybackStrategy({
        playbackRate: this.config.playbackRate,
        instanceId: this.config.instanceId,
      });
    } else {
      this.strategy = new HTML5PlaybackStrategy(this.config.instanceId);
    }

    this.strategyType = type;
    console.log(`[AdaptiveStrategy] Switched to: ${type} playback`);
  }

  // Delegate all methods to selected strategy
  async play(source: string | Blob, chunkIndex: number): Promise<void> {
    return this.strategy.play(source, chunkIndex);
  }

  pause(): void {
    this.strategy.pause();
  }

  async resume(): Promise<void> {
    return this.strategy.resume();
  }

  stop(): void {
    this.strategy.stop();
  }

  setPlaybackRate(rate: number): void {
    this.config.playbackRate = rate;
    this.strategy.setPlaybackRate(rate);
  }

  getCurrentTime(): number {
    return this.strategy.getCurrentTime();
  }

  getDuration(): number {
    return this.strategy.getDuration();
  }

  isPlaying(): boolean {
    return this.strategy.isPlaying();
  }

  isPaused(): boolean {
    return this.strategy.isPaused();
  }

  getCurrentChunkIndex(): number | null {
    return this.strategy.getCurrentChunkIndex();
  }

  setEventHandlers(handlers: TTSEventHandlers): void {
    this.strategy.setEventHandlers(handlers);
  }

  async prepareChunk(chunkIndex: number, audioBlob: Blob): Promise<void> {
    return this.strategy.prepareChunk(chunkIndex, audioBlob);
  }

  cleanup(): void {
    this.strategy.cleanup();
  }
}

/**
 * Factory function to create adaptive strategy
 */
export function createAdaptivePlaybackStrategy(
  config?: AdaptiveStrategyConfig
): AdaptivePlaybackStrategy {
  return new AdaptivePlaybackStrategy(config);
}

