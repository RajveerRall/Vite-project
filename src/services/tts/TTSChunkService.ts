/**
 * Service for managing TTS chunks (splitting, fetching, buffering)
 * Implements chunk processing and audio buffer management
 */

import { IChunkService, TTSConfig } from '../../types/tts';
import { TTS_CHUNK, TTS_API, TTS_AUDIO, TTS_TIMING } from '../../constants/tts';
import { TTSErrorHandler } from './TTSErrorHandler';

export interface AudioBufferManager {
  buffer: Record<number, string>;
  durations: Record<number, number>;
  voice: string;
  clear: () => void;
}

export class TTSChunkService implements IChunkService {
  private audioBuffer: Record<number, string> = {}; // Blob URLs for HTML5 Audio
  private audioBufferObjects: Map<number, Blob> = new Map(); // Blob objects for Web Audio API
  private decodedBuffers: Map<number, AudioBuffer> = new Map(); // Pre-decoded AudioBuffers
  private durationsBuffer: Record<number, number> = {};
  private bufferVoice: string;
  private audioContext: AudioContext | null = null;
  private instanceId: string;

  constructor(instanceId?: string) {
    this.instanceId = instanceId || `ChunkService_${Date.now()}`;
    this.bufferVoice = '';
  }

  /**
   * Split text into sentence chunks
   */
  splitText(text: string): string[] {
    return text
      .split(TTS_CHUNK.SPLIT_REGEX)
      .filter((chunk) => chunk.trim().length >= TTS_CHUNK.MIN_CHUNK_LENGTH);
  }

  /**
   * Get blob duration in seconds
   */
  private async getBlobDurationSeconds(blob: Blob): Promise<number> {
    try {
      if (!this.audioContext) {
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return 0;
        this.audioContext = new Ctx();
      }
      const arrayBuf = await blob.arrayBuffer();
      const audioBuf = await new Promise<AudioBuffer>((resolve, reject) => {
        this.audioContext!.decodeAudioData(arrayBuf, resolve, reject);
      });
      return Math.max(0, Math.round(audioBuf.duration));
    } catch {
      return 0;
    }
  }

  /**
   * Build TTS API URL
   */
  private buildApiUrl(): string {
    const ttsApiUrl = import.meta.env[TTS_API.ENV_VAR] || '';
    return ttsApiUrl ? `${ttsApiUrl}${TTS_API.ENDPOINT}` : TTS_API.ENDPOINT;
  }

  /**
   * Build query parameters for TTS request
   */
  private buildQueryParams(text: string, config: TTSConfig): URLSearchParams {
    const params = new URLSearchParams({
      text,
      voice: config.selectedVoice,
      format: config.format || TTS_AUDIO.DEFAULT_FORMAT,
    });

    // Add speed parameter if not 1
    if (config.ttsSpeed !== 1) {
      const speedPercent = Math.round((config.ttsSpeed - 1) * 100);
      const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
      params.set('rate', speedParam);
    }

    return params;
  }

  /**
   * Fetch audio blob for a chunk
   */
  async fetchChunkAudio(chunkIndex: number, text: string, config: TTSConfig): Promise<Blob> {
    const apiUrl = this.buildApiUrl();
    const params = this.buildQueryParams(text, config);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TTS_API.TIMEOUT_MS);

    try {
      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw TTSErrorHandler.handleSynthesisError(
          new Error(`Failed to fetch TTS audio: ${response.statusText}`),
          chunkIndex
        );
      }

      const audioBlob = await response.blob();

      if (audioBlob.size === 0) {
        throw TTSErrorHandler.handleSynthesisError(
          new Error(`Received empty audio blob for chunk #${chunkIndex}`),
          chunkIndex
        );
      }

      // Try to get duration from header, otherwise decode
      try {
        const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
        const seconds = headerSeconds > 0 ? headerSeconds : await this.getBlobDurationSeconds(audioBlob);
        this.durationsBuffer[chunkIndex] = seconds;
      } catch {
        // Duration tracking failed, continue anyway
      }

      return audioBlob;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as any)?.name === 'AbortError') {
        throw TTSErrorHandler.handleNetworkError(error, chunkIndex);
      }
      throw TTSErrorHandler.handleSynthesisError(error, chunkIndex);
    }
  }

  /**
   * Prefetch a chunk and add to buffer
   */
  async prefetchChunk(
    chunkIndex: number,
    text: string,
    config: TTSConfig
  ): Promise<string> {
    // Skip if already buffered with correct voice
    if (this.audioBuffer[chunkIndex] && this.bufferVoice === config.selectedVoice) {
      return this.audioBuffer[chunkIndex];
    }

    try {
      const audioBlob = await this.fetchChunkAudio(chunkIndex, text, config);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Store both blob URL (for HTML5) and blob object (for Web Audio)
      this.audioBuffer[chunkIndex] = audioUrl;
      this.audioBufferObjects.set(chunkIndex, audioBlob);
      this.bufferVoice = config.selectedVoice;

      console.log(
        `[${this.instanceId}][Prefetch] Successfully buffered chunk #${chunkIndex} with voice ${config.selectedVoice}`
      );

      return audioUrl;
    } catch (error) {
      console.warn(`[${this.instanceId}][Prefetch] Failed to pre-fetch chunk #${chunkIndex}`, error);
      throw error;
    }
  }

  /**
   * Pre-decode chunk for Web Audio API (for seamless playback)
   */
  async preDecodeChunk(chunkIndex: number, audioBlob: Blob): Promise<AudioBuffer> {
    if (!this.audioContext) {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) {
        throw new Error('Web Audio API not supported');
      }
      this.audioContext = new Ctx();
    }

    // Check if already decoded
    if (this.decodedBuffers.has(chunkIndex)) {
      return this.decodedBuffers.get(chunkIndex)!;
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.decodedBuffers.set(chunkIndex, audioBuffer);
      
      console.log(
        `[${this.instanceId}][PreDecode] Pre-decoded chunk #${chunkIndex} (duration: ${audioBuffer.duration.toFixed(2)}s)`
      );
      
      return audioBuffer;
    } catch (error) {
      console.error(`[${this.instanceId}][PreDecode] Failed to pre-decode chunk #${chunkIndex}:`, error);
      throw error;
    }
  }

  /**
   * Get pre-decoded AudioBuffer
   */
  getDecodedBuffer(chunkIndex: number): AudioBuffer | null {
    return this.decodedBuffers.get(chunkIndex) || null;
  }

  /**
   * Get blob object for chunk (for Web Audio API)
   */
  getBlob(chunkIndex: number): Blob | null {
    return this.audioBufferObjects.get(chunkIndex) || null;
  }

  /**
   * Prefetch multiple chunks
   */
  async prefetchChunks(
    startIndex: number,
    chunks: string[],
    config: TTSConfig,
    maxPrefetch: number = TTS_CHUNK.PREFETCH_COUNT
  ): Promise<void> {
    const chunksToFetch = chunks.slice(startIndex, startIndex + maxPrefetch);
    if (chunksToFetch.length === 0) return;

    console.log(`[${this.instanceId}][Prefetch] Starting pre-fetch for chunks from index ${startIndex}`);

    const promises = chunksToFetch.map(async (chunkText, i) => {
      const chunkIndex = startIndex + i;
      
      // Skip if already buffered
      if (this.audioBuffer[chunkIndex] && this.bufferVoice === config.selectedVoice) {
        return;
      }

      try {
        await this.prefetchChunk(chunkIndex, chunkText, config);
      } catch (error) {
        // Continue with other chunks even if one fails
        console.warn(`[${this.instanceId}][Prefetch] Chunk #${chunkIndex} failed:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get chunk audio URL from buffer
   */
  getChunkAudio(chunkIndex: number): string | null {
    return this.audioBuffer[chunkIndex] || null;
  }

  /**
   * Get chunk duration
   */
  getChunkDuration(chunkIndex: number): number | null {
    return this.durationsBuffer[chunkIndex] || null;
  }

  /**
   * Validate buffer entry for a chunk
   */
  validateBuffer(chunkIndex: number, voice: string): boolean {
    const url = this.audioBuffer[chunkIndex];
    if (!url || !url.startsWith('blob:')) return false;
    return this.bufferVoice === voice;
  }

  /**
   * Clear audio buffer
   */
  clearBuffer(): void {
    const bufferUrls = Object.values(this.audioBuffer);
    console.log(`[${this.instanceId}][clearBuffer] Clearing ${bufferUrls.length} buffered audio URLs and ${this.decodedBuffers.size} decoded buffers`);
    
    bufferUrls.forEach((url) => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    this.audioBuffer = {};
    this.audioBufferObjects.clear();
    this.decodedBuffers.clear();
    this.durationsBuffer = {};
  }

  /**
   * Get buffer manager interface
   */
  getBufferManager(): AudioBufferManager {
    return {
      buffer: this.audioBuffer,
      durations: this.durationsBuffer,
      voice: this.bufferVoice,
      clear: () => this.clearBuffer(),
    };
  }

  /**
   * Get decoded buffers map (for Web Audio API)
   */
  getDecodedBuffers(): Map<number, AudioBuffer> {
    return this.decodedBuffers;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearBuffer();
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
  }
}

/**
 * Factory function to create chunk service
 */
export function createTTSChunkService(instanceId?: string): TTSChunkService {
  return new TTSChunkService(instanceId);
}

